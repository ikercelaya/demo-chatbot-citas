'use client';

import { useMemo, useState } from 'react';
import {
  todayStr,
  isWorkday,
  addDays,
  dayOfWeek,
  formatDateLong,
  ESTADO_CITA_STYLES,
  type EstadoCita,
} from '@/lib/appointments';
import type { AppointmentWithRelations } from '@/lib/supabase';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function mapsUrl(direccion: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

export default function AppointmentCalendar({
  appointments,
  onSelect,
}: {
  appointments: AppointmentWithRelations[];
  onSelect: (appt: AppointmentWithRelations) => void;
}) {
  const today = todayStr();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m }; // month 1–12
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentWithRelations[]>();
    for (const a of appointments) {
      if (!map.has(a.fecha)) map.set(a.fecha, []);
      map.get(a.fecha)!.push(a);
    }
    for (const list of map.values()) list.sort((x, y) => x.hora.localeCompare(y.hora));
    return map;
  }, [appointments]);

  const cells = useMemo(() => {
    const mm = String(cursor.month).padStart(2, '0');
    const first = `${cursor.year}-${mm}-01`;
    const offset = (dayOfWeek(first) + 6) % 7; // 0 = lunes
    const start = addDays(first, -offset);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const monthPrefix = `${cursor.year}-${String(cursor.month).padStart(2, '0')}`;

  function shiftMonth(delta: number) {
    setSelectedDay(null);
    setCursor((c) => {
      let m = c.month + delta;
      let y = c.year;
      if (m < 1) { m = 12; y--; }
      if (m > 12) { m = 1; y++; }
      return { year: y, month: m };
    });
  }

  function goToday() {
    const [y, m] = today.split('-').map(Number);
    setCursor({ year: y, month: m });
    setSelectedDay(today);
  }

  const selectedAppts = selectedDay ? byDay.get(selectedDay) ?? [] : [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Cabecera */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {MONTHS[cursor.month - 1]} {cursor.year}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={() => shiftMonth(-1)} className="rounded-lg px-3 py-1.5 text-gray-500 hover:bg-gray-100" aria-label="Mes anterior">←</button>
          <button onClick={goToday} className="rounded-lg px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50">Hoy</button>
          <button onClick={() => shiftMonth(1)} className="rounded-lg px-3 py-1.5 text-gray-500 hover:bg-gray-100" aria-label="Mes siguiente">→</button>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400">
        {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>

      {/* Celdas */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const inMonth = cell.startsWith(monthPrefix);
          const isToday = cell === today;
          const workday = isWorkday(cell);
          const dayNum = Number(cell.slice(-2));
          const dayAppts = byDay.get(cell) ?? [];
          const visible = dayAppts.slice(0, 3);
          const extra = dayAppts.length - visible.length;

          return (
            <button
              key={cell}
              onClick={() => setSelectedDay(cell)}
              className={`min-h-[84px] rounded-lg border p-1.5 text-left align-top transition ${
                isToday ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-gray-300'
              } ${!inMonth ? 'opacity-40' : ''} ${!workday && inMonth ? 'bg-gray-50' : ''} ${
                selectedDay === cell ? 'ring-2 ring-orange-300' : ''
              }`}
            >
              <div className={`mb-1 text-xs font-semibold ${isToday ? 'text-orange-700' : 'text-gray-600'}`}>
                {dayNum}
              </div>
              <div className="space-y-0.5">
                {visible.map((a) => (
                  <span
                    key={a.id}
                    onClick={(e) => { e.stopPropagation(); onSelect(a); }}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] leading-tight hover:bg-gray-100"
                    title={`${a.hora} · ${a.leads?.nombre ?? 'Sin nombre'}`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ESTADO_CITA_STYLES[a.estado].dot}`} />
                    <span className="truncate text-gray-700">
                      {a.hora} {a.leads?.nombre ?? 'Cliente'}
                    </span>
                  </span>
                ))}
                {extra > 0 && <div className="px-1 text-[10px] font-medium text-gray-400">+{extra} más</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
        {(['pendiente', 'confirmada', 'completada', 'cancelada'] as EstadoCita[]).map((e) => (
          <span key={e} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${ESTADO_CITA_STYLES[e].dot}`} />
            {ESTADO_CITA_STYLES[e].label}
          </span>
        ))}
      </div>

      {/* Panel de detalle del día */}
      {selectedDay && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-sm font-bold text-gray-800">{formatDateLong(selectedDay)}</h3>
          {selectedAppts.length === 0 ? (
            <p className="text-sm text-gray-500">No hay visitas este día.</p>
          ) : (
            <ul className="space-y-2">
              {selectedAppts.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => onSelect(a)}
                    className="flex w-full items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-orange-300 hover:shadow-sm"
                  >
                    <span className="mt-0.5 font-mono text-sm font-bold text-gray-900">{a.hora}</span>
                    <span className="flex-1">
                      <span className="block font-semibold text-gray-900">{a.leads?.nombre ?? 'Cliente'}</span>
                      {a.budgets?.titulo && <span className="block text-xs text-gray-500">{a.budgets.titulo}</span>}
                      {a.direccion && (
                        <span className="mt-0.5 block text-xs text-gray-500">
                          📍{' '}
                          <a href={mapsUrl(a.direccion)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-orange-600 hover:underline">
                            {a.direccion}
                          </a>
                        </span>
                      )}
                      {a.notas && <span className="mt-0.5 block text-xs italic text-gray-400">{a.notas}</span>}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CITA_STYLES[a.estado].badge}`}>
                      {ESTADO_CITA_STYLES[a.estado].label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
