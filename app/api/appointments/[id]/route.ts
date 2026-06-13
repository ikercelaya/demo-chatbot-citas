import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { isWorkday, isValidSlot, type EstadoCita } from '@/lib/appointments';
import { isSlotTaken, fetchAppointment, ctxFromAppointment } from '@/lib/appointment-service';
import { notifyEstadoCliente, notifyCancelacion } from '@/lib/emails';
import { err, unauthorized, parseJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PatchBody {
  estado?: EstadoCita;
  fecha?: string;
  hora?: string;
  notas?: string | null;
  direccion?: string | null;
}

const ESTADOS: EstadoCita[] = ['pendiente', 'confirmada', 'completada', 'cancelada'];

/** PATCH /api/appointments/[id] — editar / reagendar / cambiar estado. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return unauthorized();
  const { id } = await ctx.params;

  const body = await parseJson<PatchBody>(req);
  if (!body) return err('JSON inválido', 400);

  try {
    const current = await fetchAppointment(id);
    if (!current) return err('Cita no encontrada', 404);

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.estado !== undefined) {
      if (!ESTADOS.includes(body.estado)) return err('Estado no válido', 400);
      update.estado = body.estado;
    }
    if (body.notas !== undefined) update.notas = body.notas;
    if (body.direccion !== undefined) update.direccion = body.direccion;

    const cambiaFechaHora = body.fecha !== undefined || body.hora !== undefined;
    if (cambiaFechaHora) {
      const nuevaFecha = body.fecha ?? current.fecha;
      const nuevaHora = body.hora ?? current.hora;
      if (!isWorkday(nuevaFecha)) return err('La fecha no es un día laborable', 400);
      if (!isValidSlot(nuevaHora)) return err('Hora no válida', 400);
      if (await isSlotTaken(nuevaFecha, nuevaHora, id)) {
        return err('Esa franja horaria ya está ocupada', 409);
      }
      update.fecha = nuevaFecha;
      update.hora = nuevaHora;
    }

    const { error } = await getSupabase().from('appointments').update(update).eq('id', id);
    if (error) throw error;

    const updated = await fetchAppointment(id);

    // Email al cliente si cambió el estado (a confirmada/completada/cancelada).
    if (updated && body.estado !== undefined && body.estado !== current.estado) {
      await notifyEstadoCliente(ctxFromAppointment(updated), body.estado);
    }

    return NextResponse.json({ appointment: updated });
  } catch (e) {
    console.error('[PATCH /api/appointments/[id]]', e);
    return err('No se pudo actualizar la cita', 500);
  }
}

/** DELETE /api/appointments/[id] — cancelación lógica (no borra la fila). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return unauthorized();
  const { id } = await ctx.params;

  try {
    const current = await fetchAppointment(id);
    if (!current) return err('Cita no encontrada', 404);

    const { error } = await getSupabase()
      .from('appointments')
      .update({ estado: 'cancelada', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;

    const updated = await fetchAppointment(id);
    if (updated) await notifyCancelacion(ctxFromAppointment(updated), 'equipo');

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/appointments/[id]]', e);
    return err('No se pudo cancelar la cita', 500);
  }
}
