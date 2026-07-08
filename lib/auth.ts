import { cookies } from 'next/headers';

export const AUTH_COOKIE = 'renoveplac_demo_session';
const AUTH_VALUE = 'admin-demo-session';

export interface DemoUser {
  id: 'admin';
  username: 'admin';
  role: 'admin';
}

const ADMIN_USER: DemoUser = {
  id: 'admin',
  username: 'admin',
  role: 'admin',
};

export function isValidAdminCredentials(username: string, password: string) {
  return username.trim().toLowerCase() === 'admin' && password === 'admin';
}

export async function getCurrentUser(): Promise<DemoUser | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE)?.value === AUTH_VALUE ? ADMIN_USER : null;
}

export async function setAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, AUTH_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
