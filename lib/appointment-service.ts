/**
 * lib/appointment-service.ts
 * Helpers de acceso a datos compartidos por las rutas de citas.
 */
import { getSupabase, APPOINTMENT_SELECT, type AppointmentWithRelations } from './supabase';
import type { ApptEmailCtx } from './emails';

/** ¿Hay ya una cita activa (no cancelada) en esa fecha+hora? */
export async function isSlotTaken(
  fecha: string,
  hora: string,
  excludeId?: string,
): Promise<boolean> {
  let query = getSupabase()
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('fecha', fecha)
    .eq('hora', hora)
    .neq('estado', 'cancelada');
  if (excludeId) query = query.neq('id', excludeId);

  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Horas ocupadas (no canceladas) de un día. */
export async function bookedSlots(fecha: string, excludeId?: string): Promise<string[]> {
  let query = getSupabase()
    .from('appointments')
    .select('hora')
    .eq('fecha', fecha)
    .neq('estado', 'cancelada');
  if (excludeId) query = query.neq('id', excludeId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => (r as { hora: string }).hora);
}

/** Cita con joins de leads/budgets. */
export async function fetchAppointment(id: string): Promise<AppointmentWithRelations | null> {
  const { data, error } = await getSupabase()
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as AppointmentWithRelations | null) ?? null;
}

/** Construye el contexto de email a partir de una cita con joins. */
export function ctxFromAppointment(appt: AppointmentWithRelations): ApptEmailCtx {
  return {
    appointmentId: appt.id,
    nombre: appt.leads?.nombre ?? null,
    email: appt.leads?.email ?? null,
    telefono: appt.leads?.telefono ?? null,
    fecha: appt.fecha,
    hora: appt.hora,
    direccion: appt.direccion,
    notas: appt.notas,
    titulo: appt.budgets?.titulo ?? null,
    total: appt.budgets?.total ?? null,
  };
}
