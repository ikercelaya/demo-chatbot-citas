/**
 * lib/supabase.ts
 * Cliente Supabase server-side con la SERVICE ROLE KEY (bypasea RLS).
 *
 * Se inicializa de forma perezosa para que el `next build` no falle si las
 * variables de entorno aún no están definidas; el error solo aparece al
 * intentar usarlo realmente en tiempo de ejecución.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EstadoCita } from './appointments';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      'Faltan SUPABASE_URL y/o SUPABASE_SERVICE_KEY en las variables de entorno.',
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// ──────────────────────────────────────────────────────────────
//  Tipos de las tablas que usa el módulo
// ──────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  session_id: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  zona: string | null;
  es_propietario: boolean | null;
  rango_presupuesto: string | null;
  estado: 'iniciado' | 'cualificado' | 'presupuestado' | 'aceptado' | 'rechazado';
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  lead_id: string;
  titulo: string;
  partidas: unknown;
  total: number;
  plazo: string | null;
  estado: 'pendiente' | 'aceptado' | 'rechazado';
  motivo_rechazo: string | null;
  created_at: string;
  accepted_at: string | null;
}

export interface PresupuestoInterno {
  id: string;
  cliente_nombre: string | null;
  cliente_email: string | null;
  cliente_telefono: string | null;
  titulo: string | null;
}

export interface Usuario {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  activo: boolean;
  allowed_tabs: string[] | null;
  expires_at: string | null;
}

export interface Appointment {
  id: string;
  lead_id: string | null;
  budget_id: string | null;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  estado: EstadoCita;
  notas: string | null;
  direccion: string | null;
  recordatorio_enviado: boolean;
  created_at: string;
  updated_at: string;
}

/** Cita con los joins que pide el código (`leads`, `budgets`). */
export interface AppointmentWithRelations extends Appointment {
  leads: Pick<Lead, 'nombre' | 'telefono' | 'email'> | null;
  budgets: Pick<Budget, 'titulo' | 'total'> | null;
}

/** Select estándar con joins usado en todo el módulo. */
export const APPOINTMENT_SELECT =
  '*, leads(nombre, telefono, email), budgets(titulo, total)';
