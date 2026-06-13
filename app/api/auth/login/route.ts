import { NextResponse } from 'next/server';
import { getSupabase, type Usuario } from '@/lib/supabase';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña obligatorios' }, { status: 400 });
  }

  let user: Usuario | null = null;
  try {
    const { data, error } = await getSupabase()
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    user = data as Usuario | null;
  } catch (err) {
    console.error('[auth/login] error consultando usuario:', err);
    return NextResponse.json({ error: 'Error de servidor' }, { status: 500 });
  }

  // Mensaje genérico para no revelar si el email existe.
  if (!user || !user.activo) {
    return NextResponse.json({ error: 'Credenciales no válidas' }, { status: 401 });
  }
  if (user.expires_at && new Date(user.expires_at) < new Date()) {
    return NextResponse.json({ error: 'La cuenta ha expirado' }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Credenciales no válidas' }, { status: 401 });
  }

  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    allowed_tabs: user.allowed_tabs ?? null,
    expires_at: user.expires_at ?? null,
  });
  await setAuthCookie(token);

  return NextResponse.json({ ok: true, role: user.role });
}
