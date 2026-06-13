/**
 * lib/auth.ts
 * Hash de contraseñas (bcrypt) y helpers de sesión (cookie httpOnly).
 * Solo se usa en route handlers (runtime Node), nunca en el middleware.
 */
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, signToken, verifyToken, type SessionPayload } from './jwt';

const SEVEN_DAYS = 7 * 24 * 60 * 60;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function setAuthCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SEVEN_DAYS,
  });
}

export async function clearAuthCookie(): Promise<void> {
  const store = await cookies();
  store.set(AUTH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Devuelve la sesión actual a partir de la cookie, o null. */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  // Usuario temporal expirado.
  if (payload.expires_at && new Date(payload.expires_at) < new Date()) return null;
  return payload;
}

export { signToken, verifyToken, AUTH_COOKIE };
export type { SessionPayload };
