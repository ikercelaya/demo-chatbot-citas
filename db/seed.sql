-- ════════════════════════════════════════════════════════════════
--  Datos de ejemplo (opcional) — ejecuta DESPUÉS de schema.sql
--  para poder probar el módulo de inmediato.
-- ════════════════════════════════════════════════════════════════

-- Usuario admin del dashboard
--   email:      admin@renoveplac.com
--   contraseña: renoveplac2026
-- (Genera tu propio hash con: npm run hash -- "tu-contraseña")
INSERT INTO usuarios (email, password_hash, role, activo)
VALUES (
  'admin@renoveplac.com',
  '$2b$10$4MK7fHzZJmfN7YmdzBue2ORqGsDty/CXQ2Oi8x.mXM5aTFva.mj3e',
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Leads de ejemplo (UUID fijos para poder probar los enlaces públicos)
INSERT INTO leads (id, session_id, nombre, telefono, email, zona, es_propietario, estado)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'seed-1', 'María García',  '600111222', 'maria@example.com',  'Valencia', true, 'presupuestado'),
  ('22222222-2222-2222-2222-222222222222', 'seed-2', 'Juan Martínez', '600333444', 'juan@example.com',   'Valencia', true, 'aceptado')
ON CONFLICT (id) DO NOTHING;

-- Presupuestos asociados a esos leads
INSERT INTO budgets (lead_id, titulo, total, plazo, estado)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Reforma integral cocina', 14500, '3 semanas', 'pendiente'),
  ('22222222-2222-2222-2222-222222222222', 'Reforma baño completo',    6800, '10 días',   'aceptado')
ON CONFLICT DO NOTHING;

-- Presupuesto interno (sin lead) — para probar el enlace cita/[id] con presupuesto interno
INSERT INTO presupuestos_internos (id, cliente_nombre, cliente_email, cliente_telefono, titulo, total)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'Lucía Pérez', 'lucia@example.com', '600555666', 'Reforma salón', 9200)
ON CONFLICT (id) DO NOTHING;

-- Enlaces públicos de prueba (sustituye el dominio):
--   Auto-agendar (lead):               /cita/11111111-1111-1111-1111-111111111111
--   Auto-agendar (presupuesto interno):/cita/33333333-3333-3333-3333-333333333333
