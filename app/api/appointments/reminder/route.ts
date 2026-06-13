import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { fetchAppointment, ctxFromAppointment } from '@/lib/appointment-service';
import { notifyRecordatorio } from '@/lib/emails';
import { err, unauthorized, parseJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/appointments/reminder — recordatorio manual de una cita. */
export async function POST(req: Request) {
  if (!(await getCurrentUser())) return unauthorized();

  const body = await parseJson<{ appointmentId?: string }>(req);
  if (!body?.appointmentId) return err('appointmentId obligatorio', 400);

  try {
    const appt = await fetchAppointment(body.appointmentId);
    if (!appt) return err('Cita no encontrada', 404);

    const ctx = ctxFromAppointment(appt);
    if (!ctx.email) return err('El cliente no tiene email', 400);

    await notifyRecordatorio(ctx);

    await getSupabase()
      .from('appointments')
      .update({ recordatorio_enviado: true })
      .eq('id', appt.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[POST reminder]', e);
    return err('No se pudo enviar el recordatorio', 500);
  }
}
