import { NextResponse } from 'next/server';
import { getConversation, handleCustomerMessage } from '@/lib/demo-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId obligatorio' }, { status: 400 });
  }

  const conversation = getConversation(conversationId);
  if (!conversation) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

export async function POST(req: Request) {
  let body: {
    conversationId?: string | null;
    customerName?: string | null;
    customerContact?: string | null;
    text?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'Mensaje obligatorio' }, { status: 400 });
  }

  try {
    const conversation = handleCustomerMessage({
      conversationId: body.conversationId,
      customerName: body.customerName,
      customerContact: body.customerContact,
      text: body.text,
    });
    return NextResponse.json({ conversation });
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar el mensaje' }, { status: 500 });
  }
}
