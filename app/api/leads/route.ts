import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { err, unauthorized } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/leads?q=texto
 * Búsqueda de clientes para el selector del BookingModal.
 * (Añadido al módulo para poder agendar citas a un lead concreto.)
 */
export async function GET(req: Request) {
  if (!(await getCurrentUser())) return unauthorized();

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  try {
    const sb = getSupabase();
    let query = sb
      .from('leads')
      .select('id, nombre, email, telefono')
      .order('updated_at', { ascending: false })
      .limit(15);

    if (q) {
      const like = `%${q}%`;
      query = query.or(`nombre.ilike.${like},email.ilike.${like},telefono.ilike.${like}`);
    }

    const { data: leads, error } = await query;
    if (error) throw error;

    // Adjunta el presupuesto más reciente de cada lead (para precargar budget_id/título).
    const ids = (leads ?? []).map((l) => (l as { id: string }).id);
    let budgetsByLead: Record<string, { id: string; titulo: string; total: number }> = {};
    if (ids.length) {
      const { data: budgets } = await sb
        .from('budgets')
        .select('id, lead_id, titulo, total, created_at')
        .in('lead_id', ids)
        .order('created_at', { ascending: false });
      for (const b of budgets ?? []) {
        const row = b as { id: string; lead_id: string; titulo: string; total: number };
        if (!budgetsByLead[row.lead_id]) {
          budgetsByLead[row.lead_id] = { id: row.id, titulo: row.titulo, total: row.total };
        }
      }
    }

    const result = (leads ?? []).map((l) => {
      const lead = l as { id: string; nombre: string | null; email: string | null; telefono: string | null };
      const budget = budgetsByLead[lead.id];
      return {
        id: lead.id,
        nombre: lead.nombre,
        email: lead.email,
        telefono: lead.telefono,
        budget_id: budget?.id ?? null,
        titulo: budget?.titulo ?? null,
        total: budget?.total ?? null,
      };
    });

    return NextResponse.json({ leads: result });
  } catch (e) {
    console.error('[GET /api/leads]', e);
    return err('Error al buscar clientes', 500);
  }
}
