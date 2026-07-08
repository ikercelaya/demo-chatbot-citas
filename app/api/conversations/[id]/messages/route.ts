import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { addStaffMessage } from '@/lib/demo-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { text?: string } | null;

  if (!body?.text?.trim()) {
    return NextResponse.json({ error: 'Mensaje obligatorio' }, { status: 400 });
  }

  const conversation = addStaffMessage(id, body.text);
  if (!conversation) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}
