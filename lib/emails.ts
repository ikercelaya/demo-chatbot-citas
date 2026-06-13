/**
 * lib/emails.ts
 * Plantillas HTML transaccionales (branding naranja) y funciones de
 * notificación para cada evento del módulo (§7 de la documentación).
 *
 * Los envíos usan `sendEmail`, que es tolerante a fallos (no lanza).
 * Para fiabilidad en serverless (Vercel) conviene AWAIT-ear estos envíos
 * antes de devolver la respuesta del handler.
 */
import { sendEmail } from './resend';
import { formatDateEs, formatDateLong, type EstadoCita } from './appointments';

const BRAND = '#ea580c';
const BRAND_LIGHT = '#f97316';

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
}

export function adminEmail(): string | null {
  return process.env.ADMIN_EMAIL || null;
}

function digitsOnly(tel?: string | null): string {
  return (tel || '').replace(/\D/g, '');
}

function mapsLink(direccion?: string | null): string | null {
  if (!direccion) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

function whatsappLink(telefono?: string | null, text?: string): string | null {
  const d = digitsOnly(telefono);
  if (!d) return null;
  const prefixed = d.startsWith('34') ? d : `34${d}`;
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${prefixed}${q}`;
}

// ──────────────────────────────────────────────────────────────
//  Contexto de email
// ──────────────────────────────────────────────────────────────

export interface ApptEmailCtx {
  appointmentId: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  fecha: string;
  hora: string;
  direccion: string | null;
  notas: string | null;
  titulo: string | null;
  total: number | null;
}

// ──────────────────────────────────────────────────────────────
//  Layout base + bloques reutilizables
// ──────────────────────────────────────────────────────────────

function layout(opts: { headerColor: string; headerTitle: string; preheader?: string; bodyHtml: string }): string {
  const { headerColor, headerTitle, preheader = '', bodyHtml } = opts;
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="background:${headerColor};padding:26px 28px;">
          <div style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:.5px;opacity:.9;">RENOVEPLAC · REFORMAS INTEGRALES</div>
          <div style="color:#ffffff;font-size:22px;font-weight:800;margin-top:6px;">${headerTitle}</div>
        </td></tr>
        <tr><td style="padding:28px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;background:#fafafa;border-top:1px solid #eee;color:#9ca3af;font-size:12px;">
          Renoveplac · Reformas integrales — visita técnica gratuita y sin compromiso.
        </td></tr>
      </table>
      <div style="color:#9ca3af;font-size:11px;margin-top:14px;">Este es un email automático, no respondas a este mensaje.</div>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string, color = BRAND): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;"><tr><td style="border-radius:8px;background:${color};">
    <a href="${href}" target="_blank" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">${label}</a>
  </td></tr></table>`;
}

/** Tabla de detalles de la cita (fecha, hora, dirección, reforma…). */
function detailsTable(ctx: ApptEmailCtx, opts: { withMaps?: boolean } = {}): string {
  const rows: string[] = [];
  const row = (k: string, v: string) =>
    `<tr><td style="padding:7px 0;color:#6b7280;font-size:13px;width:120px;">${k}</td><td style="padding:7px 0;color:#1f2937;font-size:14px;font-weight:600;">${v}</td></tr>`;

  rows.push(row('📅 Fecha', formatDateEs(ctx.fecha)));
  rows.push(row('🕒 Hora', `${ctx.hora} h`));
  if (ctx.titulo) rows.push(row('🛠️ Reforma', ctx.titulo + (ctx.total != null ? ` · ${ctx.total.toLocaleString('es-ES')} €` : '')));
  if (ctx.direccion) {
    const maps = mapsLink(ctx.direccion);
    const dir = opts.withMaps && maps
      ? `${ctx.direccion} · <a href="${maps}" target="_blank" style="color:${BRAND};">Ver en Maps</a>`
      : ctx.direccion;
    rows.push(row('📍 Dirección', dir));
  }
  if (ctx.notas) rows.push(row('📝 Notas', ctx.notas));

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:6px 16px;margin:8px 0 4px;">${rows.join('')}</table>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">${text}</p>`;
}

function manageButton(appointmentId: string): string {
  return button(`${appUrl()}/cita/gestionar/${appointmentId}`, 'Gestionar mi cita');
}

// ──────────────────────────────────────────────────────────────
//  Bloque de acciones para el ADMIN (tel, maps, whatsapp)
// ──────────────────────────────────────────────────────────────

function adminActions(ctx: ApptEmailCtx): string {
  const parts: string[] = [];
  if (ctx.telefono) {
    parts.push(`<a href="tel:${digitsOnly(ctx.telefono)}" style="color:${BRAND};font-weight:600;">📞 ${ctx.telefono}</a>`);
    const wa = whatsappLink(ctx.telefono, `Hola ${ctx.nombre || ''}, te confirmo la visita técnica del ${formatDateEs(ctx.fecha)} a las ${ctx.hora}.`);
    if (wa) parts.push(`<a href="${wa}" target="_blank" style="color:#16a34a;font-weight:600;">💬 WhatsApp</a>`);
  }
  if (ctx.email) parts.push(`<a href="mailto:${ctx.email}" style="color:${BRAND};font-weight:600;">✉️ ${ctx.email}</a>`);
  const maps = mapsLink(ctx.direccion);
  if (maps) parts.push(`<a href="${maps}" target="_blank" style="color:${BRAND};font-weight:600;">🗺️ Google Maps</a>`);
  if (!parts.length) return '';
  return `<p style="margin:14px 0 0;font-size:14px;line-height:2;">${parts.join(' &nbsp;·&nbsp; ')}</p>`;
}

// ──────────────────────────────────────────────────────────────
//  Notificaciones de cada evento
// ──────────────────────────────────────────────────────────────

const labelOrigen = (origen: 'cliente' | 'equipo') =>
  origen === 'cliente' ? 'agendada por el cliente' : 'agendada por el equipo';

/** Cita creada → email al admin + email al cliente. */
export async function notifyNuevaCita(ctx: ApptEmailCtx, origen: 'cliente' | 'equipo'): Promise<void> {
  const admin = adminEmail();
  const tasks: Promise<unknown>[] = [];

  if (admin) {
    const html = layout({
      headerColor: BRAND,
      headerTitle: 'Nueva cita ' + labelOrigen(origen),
      preheader: `Nueva visita técnica el ${formatDateEs(ctx.fecha)}`,
      bodyHtml:
        p(`Se ha registrado una <strong>nueva visita técnica</strong> con <strong>${ctx.nombre || 'cliente'}</strong>.`) +
        detailsTable(ctx, { withMaps: true }) +
        adminActions(ctx),
    });
    tasks.push(sendEmail({ to: admin, subject: `Nueva cita · ${ctx.nombre || 'cliente'} · ${formatDateEs(ctx.fecha)}`, html }));
  }

  if (ctx.email) {
    const html = layout({
      headerColor: BRAND,
      headerTitle: '¡Visita confirmada!',
      preheader: `Tu visita técnica el ${formatDateEs(ctx.fecha)}`,
      bodyHtml:
        p(`Hola ${ctx.nombre || ''}, hemos registrado tu <strong>visita técnica gratuita</strong>. Estos son los detalles:`) +
        detailsTable(ctx) +
        p('Si necesitas reagendarla o cancelarla, puedes hacerlo desde aquí (hasta 24 h antes de la visita):') +
        manageButton(ctx.appointmentId),
    });
    tasks.push(sendEmail({ to: ctx.email, subject: 'Cita confirmada · Renoveplac', html }));
  }

  await Promise.all(tasks);
}

/** Cambio de estado → email al cliente (confirmada / completada / cancelada). */
export async function notifyEstadoCliente(ctx: ApptEmailCtx, estado: EstadoCita): Promise<void> {
  if (!ctx.email) return;

  if (estado === 'confirmada') {
    const html = layout({
      headerColor: '#16a34a',
      headerTitle: 'Visita confirmada ✅',
      preheader: `Tu visita el ${formatDateEs(ctx.fecha)} está confirmada`,
      bodyHtml:
        p(`Hola ${ctx.nombre || ''}, tu visita técnica ha sido <strong>confirmada</strong> por nuestro equipo.`) +
        detailsTable(ctx) +
        p('Puedes gestionar tu cita aquí:') +
        manageButton(ctx.appointmentId),
    });
    await sendEmail({ to: ctx.email, subject: `Visita confirmada · ${formatDateEs(ctx.fecha)}`, html });
    return;
  }

  if (estado === 'completada') {
    const html = layout({
      headerColor: '#2563eb',
      headerTitle: 'Visita completada',
      preheader: 'Gracias por confiar en Renoveplac',
      bodyHtml:
        p(`Hola ${ctx.nombre || ''}, damos por <strong>completada</strong> tu visita técnica. ¡Gracias por confiar en Renoveplac!`) +
        detailsTable(ctx) +
        p('En breve recibirás noticias de nuestro equipo. Si tienes cualquier duda, responde a este correo o llámanos.'),
    });
    await sendEmail({ to: ctx.email, subject: 'Visita completada · Renoveplac', html });
    return;
  }

  if (estado === 'cancelada') {
    const html = layout({
      headerColor: '#6b7280',
      headerTitle: 'Cita cancelada',
      preheader: 'Tu visita técnica ha sido cancelada',
      bodyHtml:
        p(`Hola ${ctx.nombre || ''}, tu visita técnica del <strong>${formatDateEs(ctx.fecha)} a las ${ctx.hora}</strong> ha sido <strong>cancelada</strong>.`) +
        p('Si quieres agendar una nueva visita, contáctanos cuando quieras.'),
    });
    await sendEmail({ to: ctx.email, subject: 'Cita cancelada · Renoveplac', html });
  }
}

/** Cancelación → email al admin ("hueco libre") + email al cliente. */
export async function notifyCancelacion(ctx: ApptEmailCtx, origen: 'cliente' | 'equipo'): Promise<void> {
  const admin = adminEmail();
  const tasks: Promise<unknown>[] = [];

  if (admin) {
    const html = layout({
      headerColor: '#6b7280',
      headerTitle: 'Cita cancelada — hueco libre',
      preheader: `Se ha liberado el ${formatDateEs(ctx.fecha)} a las ${ctx.hora}`,
      bodyHtml:
        p(`La cita de <strong>${ctx.nombre || 'cliente'}</strong> ha sido cancelada (${labelOrigen(origen)}). La franja queda libre.`) +
        detailsTable(ctx, { withMaps: true }) +
        adminActions(ctx),
    });
    tasks.push(sendEmail({ to: admin, subject: `Cita cancelada · ${ctx.nombre || 'cliente'} · ${formatDateEs(ctx.fecha)}`, html }));
  }

  tasks.push(notifyEstadoCliente(ctx, 'cancelada'));
  await Promise.all(tasks);
}

/** Reagendado por el cliente → email al admin (anterior→nueva) + cliente. */
export async function notifyReagendado(
  ctx: ApptEmailCtx,
  prev: { fecha: string; hora: string },
): Promise<void> {
  const admin = adminEmail();
  const tasks: Promise<unknown>[] = [];

  if (admin) {
    const html = layout({
      headerColor: BRAND,
      headerTitle: 'Cita reagendada por el cliente',
      preheader: `Nueva fecha: ${formatDateEs(ctx.fecha)} a las ${ctx.hora}`,
      bodyHtml:
        p(`<strong>${ctx.nombre || 'El cliente'}</strong> ha reagendado su visita técnica.`) +
        p(`<span style="color:#6b7280;text-decoration:line-through;">Antes: ${formatDateEs(prev.fecha)} a las ${prev.hora}</span><br>` +
          `<strong style="color:${BRAND};">Ahora: ${formatDateEs(ctx.fecha)} a las ${ctx.hora}</strong>`) +
        detailsTable(ctx, { withMaps: true }) +
        adminActions(ctx),
    });
    tasks.push(sendEmail({ to: admin, subject: `Cita reagendada · ${ctx.nombre || 'cliente'} · ${formatDateEs(ctx.fecha)}`, html }));
  }

  if (ctx.email) {
    const html = layout({
      headerColor: BRAND,
      headerTitle: '¡Visita reagendada!',
      preheader: `Tu nueva visita el ${formatDateEs(ctx.fecha)}`,
      bodyHtml:
        p(`Hola ${ctx.nombre || ''}, tu visita técnica se ha <strong>reagendado</strong> correctamente. Nuevos detalles:`) +
        detailsTable(ctx) +
        manageButton(ctx.appointmentId),
    });
    tasks.push(sendEmail({ to: ctx.email, subject: `Visita reagendada · ${formatDateEs(ctx.fecha)}`, html }));
  }

  await Promise.all(tasks);
}

/** Recordatorio (manual o cron). `incluirAdmin` lo activa el cron. */
export async function notifyRecordatorio(ctx: ApptEmailCtx, opts: { incluirAdmin?: boolean } = {}): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (ctx.email) {
    const html = layout({
      headerColor: BRAND_LIGHT,
      headerTitle: 'Recordatorio de tu visita',
      preheader: `Tu visita técnica es el ${formatDateEs(ctx.fecha)}`,
      bodyHtml:
        p(`Hola ${ctx.nombre || ''}, te recordamos tu <strong>visita técnica</strong>:`) +
        detailsTable(ctx) +
        p('Si no puedes asistir, gestiona tu cita aquí (hasta 24 h antes):') +
        manageButton(ctx.appointmentId),
    });
    tasks.push(sendEmail({ to: ctx.email, subject: `Recordatorio: visita técnica · ${formatDateEs(ctx.fecha)}`, html }));
  }

  if (opts.incluirAdmin) {
    const admin = adminEmail();
    if (admin) {
      const html = layout({
        headerColor: BRAND_LIGHT,
        headerTitle: 'Visita mañana',
        preheader: `${ctx.nombre || 'Cliente'} · ${formatDateLong(ctx.fecha)} a las ${ctx.hora}`,
        bodyHtml:
          p(`Recordatorio: mañana tienes una visita técnica con <strong>${ctx.nombre || 'cliente'}</strong>.`) +
          detailsTable(ctx, { withMaps: true }) +
          adminActions(ctx),
      });
      tasks.push(sendEmail({ to: admin, subject: `Cita mañana: ${ctx.nombre || 'cliente'} · ${ctx.hora}`, html }));
    }
  }

  await Promise.all(tasks);
}
