'use client';

import { useCallback, useState } from 'react';
import Modal from '@/components/Modal';
import SlotPicker, { type Availability } from '@/components/SlotPicker';
import { formatDateEs } from '@/lib/appointments';

interface LeadLite {
  id: string;
  nombre: string | null;
  email?: string | null;
  telefono?: string | null;
  budget_id: string | null;
  titulo: string | null;
}

export default function BookingModal({
  leadId,
  budgetId,
  leadNombre,
  onClose,
  onBooked,
}: {
  leadId?: string;
  budgetId?: string | null;
  leadNombre?: string | null;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [lead, setLead] = useState<LeadLite | null>(
    leadId ? { id: leadId, nombre: leadNombre ?? null, budget_id: budgetId ?? null, titulo: null } : null,
  );
  const [q, setQ] = useState('');
  const [results, setResults] = useState<LeadLite[]>([]);
  const [searching, setSearching] = useState(false);

  const [sel, setSel] = useState<{ fecha?: string; hora?: string }>({});
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function search(text: string) {
    setQ(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const r = await fetch(`/api/leads?q=${encodeURIComponent(text)}`);
      const d = await r.json();
      setResults(d.leads || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  const fetchSlots = useCallback(async (fecha: string): Promise<Availability> => {
    const r = await fetch(`/api/appointments/availability?date=${fecha}`);
    return r.json();
  }, []);

  async function submit() {
    if (!lead) return;
    if (!sel.fecha || !sel.hora) return setError('Elige día y hora');
    if (!direccion.trim()) return setError('La dirección es obligatoria');
    setError(null);
    setSaving(true);
    try {
      const r = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          budget_id: lead.budget_id,
          fecha: sel.fecha,
          hora: sel.hora,
          direccion: direccion.trim(),
          notas: notas.trim() || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) return setError(d.error || 'No se pudo agendar la cita');
      setDone(true);
      setTimeout(onBooked, 1800);
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200';

  return (
    <Modal onClose={onClose} title="Agendar visita técnica" maxWidth="max-w-xl">
      {done ? (
        <div className="py-12 text-center">
          <div className="text-5xl">✅</div>
          <p className="mt-4 text-lg font-bold text-gray-900">¡Cita agendada!</p>
          <p className="mt-1 text-sm text-gray-500">
            {sel.fecha && formatDateEs(sel.fecha)} a las {sel.hora}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {!lead ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cliente</label>
              <input
                value={q}
                onChange={(e) => search(e.target.value)}
                placeholder="Buscar por nombre, email o teléfono…"
                className={inputCls}
                autoFocus
              />
              {searching && <p className="mt-2 text-xs text-gray-400">Buscando…</p>}
              {results.length > 0 && (
                <ul className="mt-2 max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => setLead(r)}
                        className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-orange-50"
                      >
                        <span className="text-sm font-medium text-gray-900">{r.nombre || 'Sin nombre'}</span>
                        <span className="text-xs text-gray-400">
                          {[r.email, r.telefono, r.titulo].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {q && !searching && results.length === 0 && (
                <p className="mt-2 text-xs text-gray-400">No se encontraron clientes.</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2.5">
              <div>
                <span className="font-semibold text-gray-900">{lead.nombre || 'Cliente'}</span>
                {lead.titulo && <span className="text-xs text-gray-500"> · {lead.titulo}</span>}
              </div>
              {!leadId && (
                <button onClick={() => setLead(null)} className="text-xs font-medium text-orange-700 hover:underline">
                  Cambiar
                </button>
              )}
            </div>
          )}

          {lead && (
            <>
              <SlotPicker value={sel} onChange={setSel} fetchSlots={fetchSlots} />

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Dirección de la obra *</label>
                <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, población…" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notas (opcional)</label>
                <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className={inputCls} />
              </div>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
                <button
                  onClick={submit}
                  disabled={saving || !sel.hora}
                  className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? 'Agendando…' : 'Agendar cita'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
