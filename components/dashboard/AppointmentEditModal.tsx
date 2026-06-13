'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import {
  TIME_SLOTS,
  ESTADO_CITA_STYLES,
  type EstadoCita,
} from '@/lib/appointments';
import type { AppointmentWithRelations } from '@/lib/supabase';

const ESTADOS: EstadoCita[] = ['pendiente', 'confirmada', 'completada', 'cancelada'];

function digits(tel?: string | null) {
  return (tel || '').replace(/\D/g, '');
}
function mapsUrl(direccion: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}
function waUrl(tel: string, nombre: string | null, fecha: string, hora: string) {
  const d = digits(tel);
  const num = d.startsWith('34') ? d : `34${d}`;
  const msg = `Hola ${nombre || ''}, te confirmo la visita técnica del ${fecha} a las ${hora}.`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

export default function AppointmentEditModal({
  appointment,
  onClose,
  onSaved,
}: {
  appointment: AppointmentWithRelations;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [estado, setEstado] = useState<EstadoCita>(appointment.estado);
  const [fecha, setFecha] = useState(appointment.fecha);
  const [hora, setHora] = useState(appointment.hora);
  const [direccion, setDireccion] = useState(appointment.direccion ?? '');
  const [notas, setNotas] = useState(appointment.notas ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminderSent, setReminderSent] = useState(appointment.recordatorio_enviado);
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  const lead = appointment.leads;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, fecha, hora, direccion: direccion.trim() || null, notas: notas.trim() || null }),
      });
      const d = await r.json();
      if (!r.ok) return setError(d.error || 'No se pudo guardar');
      onSaved();
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  async function cancelAppointment() {
    if (!confirm('¿Cancelar esta cita? El cliente recibirá un email de cancelación.')) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/appointments/${appointment.id}`, { method: 'DELETE' });
      if (!r.ok) {
        const d = await r.json();
        return setError(d.error || 'No se pudo cancelar');
      }
      onSaved();
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  async function sendReminder() {
    setReminderMsg(null);
    try {
      const r = await fetch('/api/appointments/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: appointment.id }),
      });
      const d = await r.json();
      if (!r.ok) return setReminderMsg(d.error || 'No se pudo enviar');
      setReminderSent(true);
      setReminderMsg('Recordatorio enviado ✓');
    } catch {
      setReminderMsg('Error de conexión');
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200';

  return (
    <Modal onClose={onClose} title="Visita técnica" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Datos del cliente (solo lectura) */}
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <div className="font-semibold text-gray-900">{lead?.nombre ?? 'Cliente'}</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-gray-500">
            {lead?.telefono && <a href={`tel:${digits(lead.telefono)}`} className="hover:text-orange-600">📞 {lead.telefono}</a>}
            {lead?.email && <a href={`mailto:${lead.email}`} className="hover:text-orange-600">✉️ {lead.email}</a>}
          </div>
          {appointment.budgets?.titulo && (
            <div className="mt-1 text-gray-600">
              🛠️ {appointment.budgets.titulo}
              {appointment.budgets.total != null && ` · ${Number(appointment.budgets.total).toLocaleString('es-ES')} €`}
            </div>
          )}
        </div>

        {/* Estado */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Estado</label>
          <div className="flex flex-wrap gap-2">
            {ESTADOS.map((e) => (
              <button
                key={e}
                onClick={() => setEstado(e)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  estado === e ? ESTADO_CITA_STYLES[e].badge + ' ring-2 ring-offset-1 ring-gray-300' : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {ESTADO_CITA_STYLES[e].label}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha + Hora */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Hora</label>
            <select value={hora} onChange={(e) => setHora(e.target.value)} className={inputCls}>
              {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Dirección */}
        <div>
          <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
            Dirección
            {direccion.trim() && (
              <a href={mapsUrl(direccion)} target="_blank" rel="noreferrer" className="text-xs font-normal text-orange-600 hover:underline">📍 Ver en Google Maps</a>
            )}
          </label>
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={inputCls} />
        </div>

        {/* Notas */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className={inputCls} />
        </div>

        {/* Accesos rápidos */}
        <div className="flex flex-wrap gap-2">
          {lead?.telefono && (
            <a href={waUrl(lead.telefono, lead.nombre ?? null, fecha, hora)} target="_blank" rel="noreferrer" className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">💬 WhatsApp</a>
          )}
          <button
            onClick={sendReminder}
            disabled={reminderSent || !lead?.email}
            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            title={!lead?.email ? 'El cliente no tiene email' : reminderSent ? 'Ya enviado' : ''}
          >
            ✉️ {reminderSent ? 'Recordatorio enviado' : 'Enviar recordatorio'}
          </button>
          {reminderMsg && <span className="self-center text-xs text-gray-500">{reminderMsg}</span>}
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {/* Acciones */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <button onClick={cancelAppointment} disabled={saving} className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
            Cancelar cita
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cerrar</button>
            <button onClick={save} disabled={saving} className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
