'use client';

import { useEffect, useState } from 'react';
import { todayStr, isWorkday, isPastDate, addDays, dayOfWeek, TIME_SLOTS } from '@/lib/appointments';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export interface Availability {
  isWorkday: boolean;
  slots: string[];
  booked: string[];
}

export default function SlotPicker({
  value,
  onChange,
  fetchSlots,
}: {
  value: { fecha?: string; hora?: string };
  onChange: (v: { fecha: string; hora?: string }) => void;
  fetchSlots: (fecha: string) => Promise<Availability>;
}) {
  const today = todayStr();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m };
  });
  const [avail, setAvail] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!value.fecha) {
      setAvail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchSlots(value.fecha)
      .then((a) => !cancelled && setAvail(a))
      .catch(() => !cancelled && setAvail({ isWorkday: false, slots: [], booked: [] }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.fecha]);

  const cells = (() => {
    const mm = String(cursor.month).padStart(2, '0');
    const first = `${cursor.year}-${mm}-01`;
    const offset = (dayOfWeek(first) + 6) % 7;
    const start = addDays(first, -offset);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  })();

  const monthPrefix = `${cursor.year}-${String(cursor.month).padStart(2, '0')}`;

  function shiftMonth(delta: number) {
    setCursor((c) => {
      let m = c.month + delta;
      let y = c.year;
      if (m < 1) { m = 12; y--; }
      if (m > 12) { m = 1; y++; }
      return { year: y, month: m };
    });
  }

  return (
    <div className="space-y-4">
      {/* Calendario */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => shiftMonth(-1)} className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100">←</button>
          <span className="text-sm font-semibold text-gray-800">{MONTHS[cursor.month - 1]} {cursor.year}</span>
          <button type="button" onClick={() => shiftMonth(1)} className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
          {WEEKDAYS.map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const inMonth = cell.startsWith(monthPrefix);
            const disabled = isPastDate(cell) || !isWorkday(cell);
            const selected = value.fecha === cell;
            const isToday = cell === today;
            return (
              <button
                key={cell}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ fecha: cell })}
                className={`aspect-square rounded-lg text-sm transition ${
                  selected
                    ? 'bg-orange-600 font-bold text-white'
                    : disabled
                      ? 'cursor-not-allowed text-gray-300'
                      : 'text-gray-700 hover:bg-orange-100'
                } ${!inMonth ? 'opacity-30' : ''} ${isToday && !selected ? 'ring-1 ring-orange-300' : ''}`}
              >
                {Number(cell.slice(-2))}
              </button>
            );
          })}
        </div>
      </div>

      {/* Franjas */}
      {value.fecha && (
        <div>
          <div className="mb-2 text-sm font-medium text-gray-700">Horario disponible</div>
          {loading ? (
            <p className="text-sm text-gray-400">Cargando franjas…</p>
          ) : avail && !avail.isWorkday ? (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">Ese día no hay visitas disponibles.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {TIME_SLOTS.map((slot) => {
                const free = avail?.slots.includes(slot);
                const selected = value.hora === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={!free}
                    onClick={() => onChange({ fecha: value.fecha!, hora: slot })}
                    className={`rounded-lg border py-2 text-sm font-medium transition ${
                      selected
                        ? 'border-orange-600 bg-orange-600 text-white'
                        : free
                          ? 'border-gray-200 text-gray-700 hover:border-orange-400 hover:bg-orange-50'
                          : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 line-through'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
