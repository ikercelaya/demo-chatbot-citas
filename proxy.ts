import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, verifyToken } from '@/lib/jwt';

/**
 * Protege /dashboard/:path* (convención `proxy` de Next.js 16).
 * NOTA: el proxy NO cubre /api/* — las rutas internas de citas
 * verifican la sesión en el propio handler (ver getCurrentUser).
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Usuario temporal expirado.
  if (payload.expires_at && new Date(payload.expires_at) < new Date()) {
    const url = new URL('/login', req.url);
    url.searchParams.set('expired', '1');
    return NextResponse.redirect(url);
  }

  // /dashboard/usuarios solo para admin.
  if (pathname.startsWith('/dashboard/usuarios') && payload.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard/appointments', req.url));
  }

  // allowed_tabs: si está definido, restringe las secciones accesibles.
  if (
    Array.isArray(payload.allowed_tabs) &&
    payload.allowed_tabs.length > 0 &&
    payload.role !== 'admin'
  ) {
    const section = pathname.split('/')[2] || '';
    if (section && !payload.allowed_tabs.includes(section)) {
      return NextResponse.redirect(
        new URL(`/dashboard/${payload.allowed_tabs[0]}`, req.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
