/**
 * lib/resend.ts
 * Cliente Resend (perezoso) + helper de envío tolerante a fallos.
 *
 * Si no hay RESEND_API_KEY configurada, `sendEmail` simplemente registra
 * un aviso y no lanza: el módulo sigue funcionando sin emails (útil en
 * desarrollo o demo). El remitente se toma de RESEND_FROM_EMAIL con
 * fallback a `onboarding@resend.dev`.
 */
import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

export function fromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'Renoveplac <onboarding@resend.dev>';
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Envía un email. Nunca lanza: devuelve `false` si no se pudo enviar
 * (sin clave o error de Resend) para no bloquear el flujo principal.
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn(`[resend] RESEND_API_KEY no configurada — email omitido: "${subject}" → ${to}`);
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from: fromEmail(), to, subject, html });
    if (error) {
      console.error('[resend] Error al enviar email:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[resend] Excepción al enviar email:', err);
    return false;
  }
}
