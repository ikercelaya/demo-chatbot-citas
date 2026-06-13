-- ════════════════════════════════════════════════════════════════
--  Módulo de Citas — Esquema de base de datos (Supabase / PostgreSQL)
--  Ejecuta este script en el SQL Editor de tu proyecto Supabase.
--  Reconstruido a partir del uso real del código (§3 de la doc).
-- ════════════════════════════════════════════════════════════════

-- ── leads ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        text NOT NULL,
  nombre            text,
  telefono          text,
  email             text,
  zona              text,
  es_propietario    boolean,
  rango_presupuesto text,
  estado            text NOT NULL DEFAULT 'iniciado'
                    CHECK (estado IN ('iniciado','cualificado','presupuestado','aceptado','rechazado')),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- ── budgets ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  titulo          text NOT NULL,
  partidas        jsonb NOT NULL DEFAULT '[]',
  total           numeric NOT NULL,
  plazo           text,
  estado          text NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','aceptado','rechazado')),
  motivo_rechazo  text,
  created_at      timestamptz DEFAULT now(),
  accepted_at     timestamptz
);

-- ── presupuestos_internos ───────────────────────────────────────
-- Presupuesto creado a mano por el equipo (sin lead). Solo lo usa la
-- página pública cita/[id] para resolver datos del cliente.
CREATE TABLE IF NOT EXISTS presupuestos_internos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nombre    text,
  cliente_email     text,
  cliente_telefono  text,
  titulo            text,
  total             numeric,
  created_at        timestamptz DEFAULT now()
);

-- ── usuarios (login del dashboard) ──────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'staff',
  activo        boolean NOT NULL DEFAULT true,
  allowed_tabs  text[],
  expires_at    timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- ── appointments (tabla principal del módulo) ───────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               uuid REFERENCES leads(id) ON DELETE CASCADE,    -- null si nace de un presupuesto interno
  budget_id             uuid REFERENCES budgets(id) ON DELETE SET NULL, -- presupuesto asociado (opcional)
  fecha                 date    NOT NULL,                               -- 'YYYY-MM-DD'
  hora                  text    NOT NULL,                               -- '08:00' .. '17:00'
  estado                text    NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente','confirmada','cancelada','completada')),
  notas                 text,
  direccion             text,
  recordatorio_enviado  boolean NOT NULL DEFAULT false,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_fecha  ON appointments(fecha);
CREATE INDEX IF NOT EXISTS idx_appointments_lead   ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_estado ON appointments(estado);

-- Seguridad: RLS activado SIN políticas. El acceso es siempre server-side
-- con la service role key (que bypasea RLS).
ALTER TABLE leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments          ENABLE ROW LEVEL SECURITY;
