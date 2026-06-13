import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { isWorkday, isPastDate, isValidSlot, freeSlots, TIME_SLOTS } from '@/lib/appointments';
import { isSlotTaken, bookedSlots } from '@/lib/appointment-service';
import { notifyNuevaCita, type ApptEmailCtx } from '@/lib/emails';
import { err, parseJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CitaEntity {
  leadId: string | null;
  budgetId: string | null;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  titulo: string | null;
  total: number | null;
}

/** Resuelve [id] como lead o, si no, como presupuesto_interno. */
async function resolveEntity(id: string): Promise<CitaEntity | null> {
  if (!UUID_RE.test(id)) return null;
  const sb = getSupabase();

  const { data: lead } = await sb
    .from('leads')
    .select('id, nombre, email, telefono')
    .eq('id', id)
    .maybeSingle();

  if (lead) {
    const { data: budget } = await sb
      .from('budgets')
      .select('id, titulo, total')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      leadId: lead.id,
      budgetId: budget?.id ?? null,
      nombre: lead.nombre,
      email: lead.email,
      telefono: lead.telefono,
      titulo: budget?.titulo ?? null,
      total: budget?.total ?? null,
    };
  }

  const { data: pre } = await sb
    .from('presupuestos_internos')
    .select('id, cliente_nombre, cliente_email, cliente_telefono, titulo, total')
    .eq('id', id)
    .maybeSingle();

  if (pre) {
    return {
      leadId: null,
      budgetId: null,
      nombre: pre.cliente_nombre,
      email: pre.cliente_email,
      telefono: pre.cliente_telefono,
      titulo: pre.titulo,
      total: pre.total ?? null,
    };
  }

  return null;
}

/**
 * GET /api/cita/[id]
 *  - ?fecha=YYYY-MM-DD → { isWorkday, slots, booked }
 *  - sin fecha          → { nombre, titulo } (datos del cliente)
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get('fecha');

  try {
    const entity = await resolveEntity(id);
    if (!entity) return err('Enlace no válido', 404);

    if (!fecha) {
      return NextResponse.json({ nombre: entity.nombre, titulo: entity.titulo });
    }

    if (isPastDate(fecha) || !isWorkday(fecha)) {
      // No laborable → todas las franjas ocupadas.
      return NextResponse.json({ isWorkday: false, slots: [], booked: [...TIME_SLOTS] });
    }
    const booked = await bookedSlots(fecha);
    return NextResponse.json({ isWorkday: true, slots: freeSlots(booked), booked });
  } catch (e) {
    console.error('[GET /api/cita/[id]]', e);
    return err('Error al consultar disponibilidad', 500);
  }
}

interface ReserveBody {
  fecha?: string;
  hora?: string;
  direccion?: string;
  notas?: string | null;
}

/** POST /api/cita/[id] — el cliente reserva su visita. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const body = await parseJson<ReserveBody>(req);
  if (!body) return err('JSON inválido', 400);

  const { fecha, hora, direccion, notas } = body;
  if (!fecha || !hora) return err('Fecha y hora obligatorias', 400);
  if (!direccion || !direccion.trim()) return err('La dirección es obligatoria', 400);
  if (!isWorkday(fecha)) return err('La fecha no es un día laborable', 400);
  if (!isValidSlot(hora)) return err('Hora no válida', 400);

  try {
    const entity = await resolveEntity(id);
    if (!entity) return err('Enlace no válido', 404);

    if (await isSlotTaken(fecha, hora)) {
      return err('Esa franja horaria ya está ocupada', 409);
    }

    const { data, error } = await getSupabase()
      .from('appointments')
      .insert({
        lead_id: entity.leadId,
        budget_id: entity.budgetId,
        fecha,
        hora,
        direccion: direccion.trim(),
        notas: notas ?? null,
        estado: 'pendiente',
      })
      .select('id')
      .single();
    if (error) throw error;

    const emailCtx: ApptEmailCtx = {
      appointmentId: data.id,
      nombre: entity.nombre,
      email: entity.email,
      telefono: entity.telefono,
      fecha,
      hora,
      direccion: direccion.trim(),
      notas: notas ?? null,
      titulo: entity.titulo,
      total: entity.total,
    };
    await notifyNuevaCita(emailCtx, 'cliente');

    return NextResponse.json({ ok: true, appointmentId: data.id });
  } catch (e) {
    console.error('[POST /api/cita/[id]]', e);
    return err('No se pudo reservar la cita', 500);
  }
}
