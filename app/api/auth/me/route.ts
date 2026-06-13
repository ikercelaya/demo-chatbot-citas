import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: user.sub,
      email: user.email,
      role: user.role,
      allowed_tabs: user.allowed_tabs ?? null,
    },
  });
}
