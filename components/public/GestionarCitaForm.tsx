'use client';

import { useCallback, useEffect, useState } from 'react';
import SlotPicker, { type Availability } from '@/components/SlotPicker';
import { formatDateEs, ESTADO_CITA_STYLES, type EstadoCita } from '@/lib/appointments';

interface Cita {
  id: string;
  fecha: string;
  hora: string;
  direccion: string | null;
  notas: string | null;
  estado: EstadoCita;
  nombre: string | null;
  titulo: string | null;
  canModify: boolean;
}

export default function GestionarCitaForm({ appointmentId }: { appointmentId: string }) {
  const [cita, setCita] = useState<Cita | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [mode, setMode] = useState<'view' | 'reagendar'>('view');
  const [sel, setSel] = useState<{ fecha?: string; hora?: string }>({});
  const [direccion, setDireccion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'cancelada' | 'reagendada' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/cita/gestionar/${appointmentId}`);
      if (!r.ok) {
        setNotFound(true);
        return;
      }
      const d = (await r.json()) as Cita;
      setCita(d);
      setDireccion(d.direccion || '');
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const fetchSlots = useCallback(
    async (fecha: string): Promise<Availability> => {
      const r = await fetch(`/api/cita/gestionar/${appointmentId}?fecha=${fecha}`);
      return r.json();
    },
    [appointmentId],
  );

  async function cancelar() {
    if (!confirm('¿Seguro que quieres cancelar tu visita técnica?')) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/cita/gestionar/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'cancelar' }),
      });
      const d = await r.json();
      if (!r.ok) return setError(d.error || 'No se pudo cancelar');
      setResult('cancelada');
    } catch {
      setError('Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function reagendar() {
    if (!sel.fecha || !sel.hora) return setError('Elige nuevo día y hora');
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/cita/gestionar/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'reagendar', fecha: sel.fecha, hora: sel.hora, direccion: direccion.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok) return setError(d.error || 'No se pudo reagendar');
      await load();
      setMode('view');
      setResult('reagendada');
    } catch {
      setError('Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  const card = 'rounded-2xl border border-gray-200 bg-white p-6 shadow-sm';

  if (loading) return <p className="text-center text-gray-400">Cargando tu cita…</p>;

  if (notFound || !cita) {
    return (
      <div className={`${card} text-center`}>
        <div className="text-4xl">🔍</div>
        <h1 className="mt-3 text-xl font-bold text-gray-900">No encontramos tu cita</h1>
        <p className="mt-1 text-sm text-gray-500">El enlace puede ser incorrecto. Contáctanos si necesitas ayuda.</p>
      </div>
    );
  }

  // Pantallas finales
  if (result === 'cancelada') {
    return (
      <div className={`${card} text-center`}>
        <div className="text-5xl">🗑️</div>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Cita cancelada</h1>
        <p className="mt-2 text-gray-600">Hemos cancelado tu visita técnica. Si cambias de idea, contáctanos para agendar una nueva.</p>
      </div>
    );
  }
  if (result === 'reagendada') {
    return (
      <div className={`${card} text-center`}>
        <div className="text-5xl">🎉</div>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">¡Visita reagendada!</h1>
        <p className="mt-2 text-gray-600">
          Tu nueva visita es el <strong>{formatDateEs(cita.fecha)}</strong> a las <strong>{cita.hora} h</strong>.
        </p>
        <p className="mt-1 text-sm text-gray-500">Te hemos enviado un email de confirmación.</p>
      </div>
    );
  }

  const Detalle = (
    <div className="rounded-xl bg-orange-50 p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900">Tu visita técnica</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_CITA_STYLES[cita.estado].badge}`}>
          {ESTADO_CITA_STYLES[cita.estado].label}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-gray-600">
        <div>📅 {formatDateEs(cita.fecha)}</div>
        <div>🕒 {cita.hora} h</div>
        {cita.direccion && <div>📍 {cita.direccion}</div>}
        {cita.titulo && <div>🛠️ {cita.titulo}</div>}
      </div>
    </div>
  );

  if (cita.estado === 'cancelada') {
    return (
      <div className={card}>
        <h1 className="mb-4 text-xl font-bold text-gray-900">Gestiona tu cita</h1>
        {Detalle}
        <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
          Esta cita está <strong>cancelada</strong>. Si quieres una nueva visita, contáctanos.
        </p>
      </div>
    );
  }

  if (!cita.canModify) {
    return (
      <div className={card}>
        <h1 className="mb-4 text-xl font-bold text-gray-900">Gestiona tu cita</h1>
        {Detalle}
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⏰ Tu visita es en menos de 24 horas, por lo que ya no puede modificarse online. Si necesitas cambiarla,
          por favor <strong>llámanos por teléfono</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      <h1 className="mb-4 text-xl font-bold text-gray-900">Gestiona tu cita</h1>
      {Detalle}

      {mode === 'view' ? (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button onClick={() => { setMode('reagendar'); setSel({}); setError(null); }} className="flex-1 rounded-lg bg-orange-600 py-2.5 font-semibold text-white hover:bg-orange-700">
            Reagendar
          </button>
          <button onClick={cancelar} disabled={busy} className="flex-1 rounded-lg border border-red-200 py-2.5 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
            Cancelar cita
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <p className="text-sm font-medium text-gray-700">Elige nuevo día y hora:</p>
          <SlotPicker value={sel} onChange={setSel} fetchSlots={fetchSlots} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Dirección de la obra</label>
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setMode('view'); setError(null); }} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
              Volver
            </button>
            <button onClick={reagendar} disabled={busy || !sel.hora} className="flex-1 rounded-lg bg-orange-600 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
              {busy ? 'Guardando…' : 'Confirmar nuevo horario'}
            </button>
          </div>
        </div>
      )}

      {mode === 'view' && error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
