import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import {
  isWorkday,
  isPastDate,
  isValidSlot,
  freeSlots,
  canModify,
  TIME_SLOTS,
} from '@/lib/appointments';
import { isSlotTaken, bookedSlots, fetchAppointment, ctxFromAppointment } from '@/lib/appointment-service';
import { notifyCancelacion, notifyReagendado } from '@/lib/emails';
import { err, parseJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cita/gestionar/[appointmentId]
 *  - sin query → datos de la cita + canModify
 *  - ?fecha=   → franjas para reagendar (excluye la propia cita)
 */
export async function GET(req: Request, ctx: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get('fecha');

  try {
    const appt = await fetchAppointment(appointmentId);
    if (!appt) return err('Cita no encontrada', 404);

    if (fecha) {
      if (isPastDate(fecha) || !isWorkday(fecha)) {
        return NextResponse.json({ isWorkday: false, slots: [], booked: [...TIME_SLOTS] });
      }
      const booked = await bookedSlots(fecha, appointmentId);
      return NextResponse.json({ isWorkday: true, slots: freeSlots(booked), booked });
    }

    return NextResponse.json({
      id: appt.id,
      fecha: appt.fecha,
      hora: appt.hora,
      direccion: appt.direccion,
      notas: appt.notas,
      estado: appt.estado,
      nombre: appt.leads?.nombre ?? null,
      email: appt.leads?.email ?? null,
      titulo: appt.budgets?.titulo ?? null,
      canModify: appt.estado !== 'cancelada' && canModify(appt.fecha, appt.hora),
    });
  } catch (e) {
    console.error('[GET gestionar]', e);
    return err('Error al consultar la cita', 500);
  }
}

interface PatchBody {
  accion?: 'cancelar' | 'reagendar';
  fecha?: string;
  hora?: string;
  direccion?: string;
}

/** PATCH /api/cita/gestionar/[appointmentId] — cancelar o reagendar. */
export async function PATCH(req: Request, ctx: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await ctx.params;

  const body = await parseJson<PatchBody>(req);
  if (!body) return err('JSON inválido', 400);

  try {
    const appt = await fetchAppointment(appointmentId);
    if (!appt) return err('Cita no encontrada', 404);

    if (appt.estado === 'cancelada') return err('La cita ya está cancelada', 409);
    if (!canModify(appt.fecha, appt.hora)) {
      return err('No se puede modificar con menos de 24 h de antelación. Por favor, llámanos por teléfono.', 403);
    }

    const sb = getSupabase();
    const now = new Date().toISOString();

    if (body.accion === 'cancelar') {
      const { error } = await sb
        .from('appointments')
        .update({ estado: 'cancelada', updated_at: now })
        .eq('id', appointmentId);
      if (error) throw error;

      const updated = await fetchAppointment(appointmentId);
      if (updated) await notifyCancelacion(ctxFromAppointment(updated), 'cliente');
      return NextResponse.json({ ok: true, accion: 'cancelar' });
    }

    if (body.accion === 'reagendar') {
      const { fecha, hora, direccion } = body;
      if (!fecha || !hora) return err('Fecha y hora obligatorias', 400);
      if (!isWorkday(fecha)) return err('La fecha no es un día laborable', 400);
      if (!isValidSlot(hora)) return err('Hora no válida', 400);
      if (await isSlotTaken(fecha, hora, appointmentId)) {
        return err('Esa franja horaria ya está ocupada', 409);
      }

      const prev = { fecha: appt.fecha, hora: appt.hora };
      const update: Record<string, unknown> = { fecha, hora, estado: 'pendiente', updated_at: now };
      if (direccion !== undefined && direccion.trim()) update.direccion = direccion.trim();

      const { error } = await sb.from('appointments').update(update).eq('id', appointmentId);
      if (error) throw error;

      const updated = await fetchAppointment(appointmentId);
      if (updated) await notifyReagendado(ctxFromAppointment(updated), prev);
      return NextResponse.json({ ok: true, accion: 'reagendar', appointmentId });
    }

    return err('Acción no válida', 400);
  } catch (e) {
    console.error('[PATCH gestionar]', e);
    return err('No se pudo actualizar la cita', 500);
  }
}
