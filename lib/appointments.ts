/**
 * lib/appointments.ts
 * Reglas de negocio del módulo de citas (§4 de la documentación).
 *
 * Nota de zona horaria: todo el cálculo de fechas se fija a `Europe/Madrid`
 * para evitar desfases entre `isWorkday`/`todayStr` (que antes iban en UTC)
 * y la regla de 24 h (que iba en hora local del servidor).
 */

export const TIMEZONE = 'Europe/Madrid';

/** 10 franjas horarias fijas, de hora en hora (08:00–17:00). */
export const TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

export type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada';

export const ESTADO_CITA_LABELS: Record<EstadoCita, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export interface EstadoStyle {
  label: string;
  /** Clases Tailwind para el badge. */
  badge: string;
  /** Clase Tailwind para el punto de color (calendario). */
  dot: string;
  /** Color hex (chart.js / emails). */
  hex: string;
}

export const ESTADO_CITA_STYLES: Record<EstadoCita, EstadoStyle> = {
  pendiente: {
    label: 'Pendiente',
    badge: 'bg-orange-100 text-orange-800 border border-orange-200',
    dot: 'bg-orange-500',
    hex: '#f97316',
  },
  confirmada: {
    label: 'Confirmada',
    badge: 'bg-green-100 text-green-800 border border-green-200',
    dot: 'bg-green-500',
    hex: '#22c55e',
  },
  completada: {
    label: 'Completada',
    badge: 'bg-blue-100 text-blue-800 border border-blue-200',
    dot: 'bg-blue-500',
    hex: '#3b82f6',
  },
  cancelada: {
    label: 'Cancelada',
    badge: 'bg-gray-100 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
    hex: '#9ca3af',
  },
};

// ──────────────────────────────────────────────────────────────
//  Helpers de fecha
// ──────────────────────────────────────────────────────────────

function parseYMD(fecha: string): { y: number; m: number; d: number } {
  const [y, m, d] = fecha.split('-').map(Number);
  return { y, m, d };
}

/** Fecha de hoy en Europe/Madrid como 'YYYY-MM-DD'. */
export function todayStr(): string {
  // 'en-CA' produce el formato YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** '2026-06-13' → '13 de junio de 2026'. */
export function formatDateEs(fecha: string): string {
  const { y, m, d } = parseYMD(fecha);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

/** '2026-06-13' → '13 jun 26'. */
export function formatDateShort(fecha: string): string {
  const { y, m, d } = parseYMD(fecha);
  return `${d} ${MESES_CORTOS[m - 1]} ${String(y).slice(-2)}`;
}

/** '2026-06-13' → 'sábado, 13 de junio de 2026'. */
export function formatDateLong(fecha: string): string {
  const { y, m, d } = parseYMD(fecha);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DIAS_SEMANA[dow]}, ${d} de ${MESES[m - 1]} de ${y}`;
}

/** Día de la semana (0=domingo … 6=sábado) de una fecha 'YYYY-MM-DD'. */
export function dayOfWeek(fecha: string): number {
  const { y, m, d } = parseYMD(fecha);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** ¿La fecha es anterior a hoy (Europe/Madrid)? */
export function isPastDate(fecha: string): boolean {
  return fecha < todayStr();
}

/** Suma (o resta) días a una fecha 'YYYY-MM-DD'. */
export function addDays(fecha: string, n: number): string {
  const { y, m, d } = parseYMD(fecha);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Fecha de mañana en Europe/Madrid ('YYYY-MM-DD'). */
export function tomorrowStr(): string {
  return addDays(todayStr(), 1);
}

// ──────────────────────────────────────────────────────────────
//  Festivos (España nacional + Comunitat Valenciana)
// ──────────────────────────────────────────────────────────────

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
function easterSunday(year: number): { m: number; d: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const dd = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - dd - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const month = Math.floor((h + l - 7 * (Math.floor((a + 11 * h + 22 * l) / 451)) + 114) / 31);
  const day = ((h + l - 7 * (Math.floor((a + 11 * h + 22 * l) / 451)) + 114) % 31) + 1;
  return { m: month, d: day };
}

/** Viernes Santo = Domingo de Pascua − 2 días. */
function goodFriday(year: number): { m: number; d: number } {
  const es = easterSunday(year);
  const date = new Date(Date.UTC(year, es.m - 1, es.d));
  date.setUTCDate(date.getUTCDate() - 2);
  return { m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

/**
 * Festivos fijos: nacionales de España + Comunitat Valenciana.
 * Si tu empresa opera en otra región, ajusta esta lista.
 */
const FESTIVOS_FIJOS: Array<[number, number]> = [
  [1, 1],   // Año Nuevo
  [1, 6],   // Reyes
  [3, 19],  // San José (Fallas — C. Valenciana)
  [5, 1],   // Día del Trabajo
  [8, 15],  // Asunción
  [10, 9],  // Día de la Comunitat Valenciana
  [10, 12], // Fiesta Nacional
  [11, 1],  // Todos los Santos
  [12, 6],  // Constitución
  [12, 8],  // Inmaculada
  [12, 25], // Navidad
];

export function isHoliday(fecha: string): boolean {
  const { y, m, d } = parseYMD(fecha);
  if (FESTIVOS_FIJOS.some(([fm, fd]) => fm === m && fd === d)) return true;
  const gf = goodFriday(y);
  return gf.m === m && gf.d === d;
}

/** Día laborable: no sábado/domingo y no festivo. */
export function isWorkday(fecha: string): boolean {
  const dow = dayOfWeek(fecha);
  if (dow === 0 || dow === 6) return false;
  return !isHoliday(fecha);
}

// ──────────────────────────────────────────────────────────────
//  Regla de 24 h (gestión pública por el cliente)
// ──────────────────────────────────────────────────────────────

/**
 * Convierte una hora de pared en Europe/Madrid ('YYYY-MM-DD', 'HH:mm')
 * al instante UTC equivalente (en ms). Robusto frente a cambios de hora.
 */
function madridWallTimeToUtcMs(fecha: string, hora: string): number {
  const { y, m, d } = parseYMD(fecha);
  const [hh, mm] = hora.split(':').map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm, 0);
  // Cómo se ve ese instante "adivinado" en Madrid (formato sv-SE → ISO).
  const madridStr = new Date(utcGuess).toLocaleString('sv-SE', { timeZone: TIMEZONE });
  const [md, mt] = madridStr.split(' ');
  const [my, mmo, mday] = md.split('-').map(Number);
  const [mhh, mmm] = mt.split(':').map(Number);
  const madridAsUtc = Date.UTC(my, mmo - 1, mday, mhh, mmm, 0);
  const offset = madridAsUtc - utcGuess; // cuánto va Madrid por delante de UTC
  return utcGuess - offset;
}

/**
 * El cliente solo puede reagendar/cancelar si faltan MÁS de 24 h
 * para la visita. (El equipo interno puede modificar siempre.)
 */
export function canModify(fecha: string, hora: string): boolean {
  const apptMs = madridWallTimeToUtcMs(fecha, hora);
  return apptMs - Date.now() > 24 * 60 * 60 * 1000;
}

// ──────────────────────────────────────────────────────────────
//  Disponibilidad de franjas
// ──────────────────────────────────────────────────────────────

/**
 * A partir de las horas ocupadas de un día, devuelve qué franjas
 * quedan libres respetando el orden de TIME_SLOTS.
 */
export function freeSlots(ocupadas: string[]): string[] {
  const set = new Set(ocupadas);
  return TIME_SLOTS.filter((s) => !set.has(s));
}

/** ¿La hora pertenece a las franjas válidas? */
export function isValidSlot(hora: string): boolean {
  return (TIME_SLOTS as readonly string[]).includes(hora);
}

/** Primer y último día del mes (1–12) en formato 'YYYY-MM-DD'. */
export function monthRange(year: number, month: number): { desde: string; hasta: string } {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    desde: `${year}-${mm}-01`,
    hasta: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}
