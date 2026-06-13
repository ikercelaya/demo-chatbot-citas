'use client';

import { useMemo, useState } from 'react';
import {
  formatDateShort,
  ESTADO_CITA_STYLES,
  ESTADO_CITA_LABELS,
  type EstadoCita,
} from '@/lib/appointments';
import type { AppointmentWithRelations } from '@/lib/supabase';

type Filtro = EstadoCita | 'todas';

const PILLS: Filtro[] = ['todas', 'pendiente', 'confirmada', 'completada', 'cancelada'];

function mapsUrl(direccion: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

export default function AppointmentsList({
  appointments,
  searchQuery = '',
  onSelect,
}: {
  appointments: AppointmentWithRelations[];
  searchQuery?: string;
  onSelect: (appt: AppointmentWithRelations) => void;
}) {
  const [estado, setEstado] = useState<Filtro>('todas');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments
      .filter((a) => {
        if (estado !== 'todas' && a.estado !== estado) return false;
        if (desde && a.fecha < desde) return false;
        if (hasta && a.fecha > hasta) return false;
        if (q) {
          const hay = `${a.leads?.nombre ?? ''} ${a.leads?.email ?? ''} ${a.leads?.telefono ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.fecha === b.fecha ? a.hora.localeCompare(b.hora) : a.fecha.localeCompare(b.fecha)));
  }, [appointments, estado, desde, hasta, searchQuery]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PILLS.map((p) => (
            <button
              key={p}
              onClick={() => setEstado(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                estado === p
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p === 'todas' ? 'Todas' : ESTADO_CITA_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-end gap-2">
          <label className="text-xs text-gray-500">
            Desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-0.5 block rounded-lg border border-gray-300 px-2 py-1 text-sm" />
          </label>
          <label className="text-xs text-gray-500">
            Hasta
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-0.5 block rounded-lg border border-gray-300 px-2 py-1 text-sm" />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No hay citas que coincidan con los filtros.</p>
      ) : (
        <>
          {/* Tabla (escritorio) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Hora</th>
                  <th className="px-3 py-2 font-semibold">Cliente</th>
                  <th className="px-3 py-2 font-semibold">Teléfono</th>
                  <th className="px-3 py-2 font-semibold">Reforma</th>
                  <th className="px-3 py-2 font-semibold">Dirección</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} onClick={() => onSelect(a)} className="cursor-pointer border-b border-gray-100 hover:bg-orange-50/50">
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900">{formatDateShort(a.fecha)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-gray-700">{a.hora}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-900">{a.leads?.nombre ?? 'Cliente'}</div>
                      {a.leads?.email && <div className="text-xs text-gray-400">{a.leads.email}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                      {a.leads?.telefono ? (
                        <a href={`tel:${a.leads.telefono}`} onClick={(e) => e.stopPropagation()} className="hover:text-orange-600">{a.leads.telefono}</a>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{a.budgets?.titulo ?? '—'}</td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 text-gray-600">
                      {a.direccion ? (
                        <a href={mapsUrl(a.direccion)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-orange-600 hover:underline">{a.direccion}</a>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CITA_STYLES[a.estado].badge}`}>
                        {ESTADO_CITA_STYLES[a.estado].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas (móvil) */}
          <div className="space-y-2 md:hidden">
            {filtered.map((a) => (
              <button key={a.id} onClick={() => onSelect(a)} className="flex w-full items-start justify-between gap-2 rounded-lg border border-gray-200 p-3 text-left hover:border-orange-300">
                <div>
                  <div className="font-semibold text-gray-900">{a.leads?.nombre ?? 'Cliente'}</div>
                  <div className="text-xs text-gray-500">{formatDateShort(a.fecha)} · {a.hora}</div>
                  {a.budgets?.titulo && <div className="text-xs text-gray-400">{a.budgets.titulo}</div>}
                  {a.direccion && <div className="mt-0.5 text-xs text-gray-400">📍 {a.direccion}</div>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CITA_STYLES[a.estado].badge}`}>
                  {ESTADO_CITA_STYLES[a.estado].label}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs text-gray-400">{filtered.length} cita(s)</p>
        </>
      )}
    </div>
  );
}
