import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { setConversationPaused } from '@/lib/demo-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { paused?: boolean } | null;

  if (typeof body?.paused !== 'boolean') {
    return NextResponse.json({ error: 'paused debe ser booleano' }, { status: 400 });
  }

  const conversation = setConversationPaused(id, body.paused);
  if (!conversation) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}
