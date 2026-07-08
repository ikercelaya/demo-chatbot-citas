import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listConversations } from '@/lib/demo-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  return NextResponse.json({ conversations: listConversations() });
}
