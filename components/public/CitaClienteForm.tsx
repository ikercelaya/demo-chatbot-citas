'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import SlotPicker, { type Availability } from '@/components/SlotPicker';
import { formatDateEs } from '@/lib/appointments';

export default function CitaClienteForm({ id }: { id: string }) {
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [nombre, setNombre] = useState<string | null>(null);
  const [titulo, setTitulo] = useState<string | null>(null);

  const [sel, setSel] = useState<{ fecha?: string; hora?: string }>({});
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/cita/${id}`);
        if (!r.ok) {
          setInvalid(true);
          return;
        }
        const d = await r.json();
        setNombre(d.nombre);
        setTitulo(d.titulo);
      } catch {
        setInvalid(true);
      } finally {
        setLoadingInfo(false);
      }
    })();
  }, [id]);

  const fetchSlots = useCallback(
    async (fecha: string): Promise<Availability> => {
      const r = await fetch(`/api/cita/${id}?fecha=${fecha}`);
      return r.json();
    },
    [id],
  );

  async function submit() {
    if (!sel.fecha || !sel.hora) return setError('Elige día y hora para tu visita');
    if (!direccion.trim()) return setError('La dirección de la obra es obligatoria');
    setError(null);
    setSaving(true);
    try {
      const r = await fetch(`/api/cita/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: sel.fecha, hora: sel.hora, direccion: direccion.trim(), notas: notas.trim() || null }),
      });
      const d = await r.json();
      if (!r.ok) return setError(d.error || 'No se pudo reservar la cita');
      setDoneId(d.appointmentId);
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200';

  if (loadingInfo) {
    return <p className="text-center text-gray-400">Cargando…</p>;
  }

  if (invalid) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-xl font-bold text-gray-900">Enlace no válido</h1>
        <p className="mt-1 text-sm text-gray-500">Este enlace no es correcto o ha caducado. Contáctanos para agendar tu visita.</p>
      </div>
    );
  }

  if (doneId) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">¡Visita confirmada!</h1>
        <p className="mt-2 text-gray-600">
          Te esperamos el <strong>{sel.fecha && formatDateEs(sel.fecha)}</strong> a las <strong>{sel.hora} h</strong>.
        </p>
        <p className="mt-1 text-sm text-gray-500">Te hemos enviado un email de confirmación.</p>
        <Link
          href={`/cita/gestionar/${doneId}`}
          className="mt-6 inline-block rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Gestionar mi cita
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agenda tu visita técnica gratuita</h1>
        <p className="mt-1 text-gray-600">
          {nombre ? `Hola ${nombre}, elige` : 'Elige'} el día y la hora que mejor te venga.
          {titulo && <span className="text-gray-400"> · {titulo}</span>}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <SlotPicker value={sel} onChange={setSel} fetchSlots={fetchSlots} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <label className="mb-1 block text-sm font-medium text-gray-700">Dirección de la obra *</label>
        <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, población…" className={inputCls} />
        <label className="mb-1 mt-4 block text-sm font-medium text-gray-700">Notas (opcional)</label>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Algo que debamos saber…" className={inputCls} />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        onClick={submit}
        disabled={saving || !sel.hora}
        className="w-full rounded-lg bg-orange-600 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
      >
        {saving ? 'Confirmando…' : 'Confirmar visita'}
      </button>
    </div>
  );
}
