import { NextResponse } from 'next/server';
import { isValidAdminCredentials, setAuthCookie } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { username?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const username = body.username ?? body.email ?? '';
  const password = body.password ?? '';

  if (!isValidAdminCredentials(username, password)) {
    return NextResponse.json({ error: 'Credenciales no válidas' }, { status: 401 });
  }

  await setAuthCookie();
  return NextResponse.json({ ok: true, user: { username: 'admin', role: 'admin' } });
}
