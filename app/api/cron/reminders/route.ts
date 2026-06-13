import { NextResponse } from 'next/server';
import { getSupabase, APPOINTMENT_SELECT, type AppointmentWithRelations } from '@/lib/supabase';
import { tomorrowStr } from '@/lib/appointments';
import { ctxFromAppointment } from '@/lib/appointment-service';
import { notifyRecordatorio } from '@/lib/emails';
import { err } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/reminders
 * Protegido por header Authorization: Bearer <CRON_SECRET> (Vercel Cron lo
 * inyecta automáticamente). Envía recordatorios de las visitas de mañana.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) return err('No autorizado', 401);
  } else {
    console.warn('[cron/reminders] CRON_SECRET no definido — endpoint sin protección.');
  }

  const fecha = tomorrowStr();

  try {
    const { data, error } = await getSupabase()
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .eq('fecha', fecha)
      .in('estado', ['pendiente', 'confirmada'])
      .eq('recordatorio_enviado', false);
    if (error) throw error;

    const citas = (data ?? []) as AppointmentWithRelations[];
    let enviados = 0;

    for (const appt of citas) {
      await notifyRecordatorio(ctxFromAppointment(appt), { incluirAdmin: true });
      await getSupabase()
        .from('appointments')
        .update({ recordatorio_enviado: true })
        .eq('id', appt.id);
      enviados++;
    }

    return NextResponse.json({ ok: true, enviados, fecha });
  } catch (e) {
    console.error('[cron/reminders]', e);
    return err('Error al enviar recordatorios', 500);
  }
}
