/**
 * lib/jwt.ts
 * Núcleo JWT (HS256 con `jose`). Compatible con el runtime Edge,
 * por eso vive aparte de bcrypt: el middleware solo importa de aquí.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export const AUTH_COOKIE = 'auth_token';
const ALG = 'HS256';
const EXPIRES = '7d';

/** Datos que guardamos en el token. */
export interface SessionClaims {
  sub: string;
  email: string;
  role: string;
  allowed_tabs?: string[] | null;
  expires_at?: string | null;
}

/** Token verificado = claims + campos estándar de JWT. */
export type SessionPayload = SessionClaims & JWTPayload;

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('Falta JWT_SECRET en las variables de entorno.');
  return new TextEncoder().encode(s);
}

export async function signToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRES)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
