'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppointmentCalendar from '@/components/dashboard/AppointmentCalendar';
import AppointmentsList from '@/components/dashboard/AppointmentsList';
import BookingModal from '@/components/dashboard/BookingModal';
import AppointmentEditModal from '@/components/dashboard/AppointmentEditModal';
import AppointmentsStatus from '@/components/dashboard/charts/AppointmentsStatus';
import { todayStr } from '@/lib/appointments';
import type { AppointmentWithRelations } from '@/lib/supabase';

type View = 'calendar' | 'list';

const KPI_DEFS: { key: string; label: string; color: string }[] = [
  { key: 'total', label: 'Total', color: 'text-gray-900' },
  { key: 'hoy', label: 'Hoy', color: 'text-orange-600' },
  { key: 'pendientes', label: 'Pendientes', color: 'text-orange-500' },
  { key: 'confirmadas', label: 'Confirmadas', color: 'text-green-600' },
  { key: 'completadas', label: 'Completadas', color: 'text-blue-600' },
];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('calendar');
  const [search, setSearch] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [booking, setBooking] = useState(false);
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/appointments');
      if (r.status === 401) {
        window.location.href = '/login';
        return;
      }
      const d = await r.json();
      setAppointments(d.appointments || []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const refresh = () => setReloadToken((t) => t + 1);

  const kpis = useMemo(() => {
    const today = todayStr();
    return {
      total: appointments.length,
      hoy: appointments.filter((a) => a.fecha === today && a.estado !== 'cancelada').length,
      pendientes: appointments.filter((a) => a.estado === 'pendiente').length,
      confirmadas: appointments.filter((a) => a.estado === 'confirmada').length,
      completadas: appointments.filter((a) => a.estado === 'completada').length,
    } as Record<string, number>;
  }, [appointments]);

  function onSearch(v: string) {
    setSearch(v);
    if (v.trim()) setView('list');
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de visitas técnicas</h1>
          <p className="text-sm text-gray-500">Agenda, calendario, recordatorios y estado de cada cita.</p>
        </div>
        <button
          onClick={() => setBooking(true)}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
        >
          ＋ Nueva cita
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {KPI_DEFS.map((k) => (
          <div key={k.key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className={`text-2xl font-bold ${k.color}`}>{kpis[k.key]}</div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2">
          {/* Controles */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="🔍 Buscar cliente…"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
            <div className="flex overflow-hidden rounded-lg border border-gray-300">
              <button
                onClick={() => setView('calendar')}
                className={`px-3 py-2 text-sm font-medium ${view === 'calendar' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                📅 Calendario
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-2 text-sm font-medium ${view === 'list' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                📋 Lista
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">Cargando citas…</div>
          ) : view === 'calendar' ? (
            <AppointmentCalendar appointments={appointments} onSelect={setSelected} />
          ) : (
            <AppointmentsList appointments={appointments} searchQuery={search} onSelect={setSelected} />
          )}
        </div>

        {/* Columna lateral: gráfico */}
        <div className="space-y-6">
          <AppointmentsStatus appointments={appointments} />
        </div>
      </div>

      {booking && (
        <BookingModal
          onClose={() => setBooking(false)}
          onBooked={() => {
            setBooking(false);
            refresh();
          }}
        />
      )}

      {selected && (
        <AppointmentEditModal
          appointment={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
