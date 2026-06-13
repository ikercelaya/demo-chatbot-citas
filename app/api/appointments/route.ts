import { NextResponse } from 'next/server';
import { getSupabase, APPOINTMENT_SELECT } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { isWorkday, isValidSlot } from '@/lib/appointments';
import { isSlotTaken, fetchAppointment, ctxFromAppointment } from '@/lib/appointment-service';
import { notifyNuevaCita } from '@/lib/emails';
import { err, unauthorized, parseJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/appointments — lista con filtros opcionales. */
export async function GET(req: Request) {
  if (!(await getCurrentUser())) return unauthorized();

  const { searchParams } = new URL(req.url);
  const lead_id = searchParams.get('lead_id');
  const estado = searchParams.get('estado');
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');

  let query = getSupabase()
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  if (lead_id) query = query.eq('lead_id', lead_id);
  if (estado && estado !== 'todas') query = query.eq('estado', estado);
  if (desde) query = query.gte('fecha', desde);
  if (hasta) query = query.lte('fecha', hasta);

  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/appointments]', error);
    return err('Error al listar citas', 500);
  }
  return NextResponse.json({ appointments: data ?? [] });
}

interface CreateBody {
  lead_id?: string;
  budget_id?: string | null;
  fecha?: string;
  hora?: string;
  notas?: string | null;
  direccion?: string | null;
}

/** POST /api/appointments — crea una cita (desde el dashboard). */
export async function POST(req: Request) {
  if (!(await getCurrentUser())) return unauthorized();

  const body = await parseJson<CreateBody>(req);
  if (!body) return err('JSON inválido', 400);

  const { lead_id, budget_id, fecha, hora, notas, direccion } = body;
  if (!lead_id || !fecha || !hora) {
    return err('lead_id, fecha y hora son obligatorios', 400);
  }
  if (!isWorkday(fecha)) return err('La fecha no es un día laborable', 400);
  if (!isValidSlot(hora)) return err('Hora no válida', 400);

  try {
    if (await isSlotTaken(fecha, hora)) {
      return err('Esa franja horaria ya está ocupada', 409);
    }

    const { data, error } = await getSupabase()
      .from('appointments')
      .insert({
        lead_id,
        budget_id: budget_id ?? null,
        fecha,
        hora,
        notas: notas ?? null,
        direccion: direccion ?? null,
        estado: 'pendiente',
      })
      .select('id')
      .single();
    if (error) throw error;

    const full = await fetchAppointment(data.id);
    if (full) await notifyNuevaCita(ctxFromAppointment(full), 'equipo');
    return NextResponse.json({ appointment: full });
  } catch (e) {
    console.error('[POST /api/appointments]', e);
    return err('No se pudo crear la cita', 500);
  }
}
