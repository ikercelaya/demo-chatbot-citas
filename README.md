# Módulo de Citas / Visitas Técnicas — Renoveplac

Sistema completo de **gestión de citas y visitas técnicas** para una empresa de
reformas, construido con **Next.js 16 (App Router) + Supabase + Resend**.

- **Cliente** (enlace público, sin login): elige día y hora de su visita técnica,
  indica la dirección de la obra y luego puede **reagendar o cancelar** desde su
  enlace único (regla de 24 h).
- **Equipo** (dashboard protegido): ve las citas en **calendario** o **lista**,
  agenda nuevas visitas, edita estado/fecha/hora/dirección/notas, cancela, envía
  recordatorios y abre accesos rápidos a WhatsApp / Google Maps. KPIs + gráfico
  de estados.
- **Automatización**: un **cron diario** (07:00) envía recordatorios de las
  visitas del día siguiente al cliente y al administrador.

Estados de una cita: `pendiente` (naranja) · `confirmada` (verde) ·
`completada` (azul) · `cancelada` (gris). La cancelación es siempre **lógica**.

---

## 1. Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19 + Tailwind CSS v4 |
| Base de datos | Supabase (PostgreSQL), acceso server-side con *service role* |
| Email | Resend |
| Auth | JWT (`jose`) en cookie httpOnly + `bcryptjs` |
| Gráficos | Chart.js (doughnut de estados) |

---

## 2. Puesta en marcha

### 2.1. Instalar dependencias

```bash
npm install
```

### 2.2. Base de datos (Supabase)

1. Crea un proyecto en [Supabase](https://supabase.com).
2. En **SQL Editor**, ejecuta [`db/schema.sql`](db/schema.sql) (crea las tablas
   `leads`, `budgets`, `presupuestos_internos`, `usuarios` y `appointments`).
3. (Opcional) Ejecuta [`db/seed.sql`](db/seed.sql) para tener un usuario admin y
   datos de ejemplo.

### 2.3. Variables de entorno

Copia `.env.example` a `.env.local` y rellena tus valores:

```bash
cp .env.example .env.local
```

| Variable | Para qué |
|----------|----------|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | *service role key* (⚠️ secreta, solo server-side) |
| `RESEND_API_KEY` | Envío de emails (si falta, los emails se omiten sin romper) |
| `RESEND_FROM_EMAIL` | Remitente, p. ej. `Renoveplac <visitas@tudominio.com>` |
| `ADMIN_EMAIL` | Bandeja que recibe los avisos de citas |
| `JWT_SECRET` | Firma de la cookie de sesión (cadena aleatoria larga) |
| `CRON_SECRET` | Protege el endpoint del cron (defínela siempre) |
| `NEXT_PUBLIC_APP_URL` | URL pública (para los enlaces de los emails) |

### 2.4. Crear un usuario del dashboard

Si no usas el seed, crea el hash de la contraseña y añádelo a `usuarios`:

```bash
npm run hash -- "tu-contraseña"
# pega el hash en la columna password_hash
```

### 2.5. Arrancar

```bash
npm run dev      # http://localhost:3000
```

- Panel: `/login` → `/dashboard/appointments`
  (seed: `admin@renoveplac.com` / `renoveplac2026`)
- Auto-agendado del cliente: `/cita/{leadId|presupuestoInternoId}`
- Gestión del cliente: `/cita/gestionar/{appointmentId}`

---

## 3. Despliegue en Vercel

1. Sube el repo a GitHub e impórtalo en [Vercel](https://vercel.com).
2. En **Settings → Environment Variables**, añade todas las variables de la tabla
   anterior (incluido `CRON_SECRET` y `NEXT_PUBLIC_APP_URL` con tu dominio).
3. El archivo [`vercel.json`](vercel.json) ya define el cron diario:

   ```json
   { "crons": [ { "path": "/api/cron/reminders", "schedule": "0 7 * * *" } ] }
   ```

   Vercel inyecta automáticamente `Authorization: Bearer <CRON_SECRET>` en las
   llamadas del cron.
4. Deploy. ✅

---

## 4. Estructura

```
app/
├─ dashboard/appointments/page.tsx     Panel (KPIs + calendario/lista + gráfico)
├─ cita/[id]/page.tsx                   PÚBLICA: el cliente auto-agenda
├─ cita/gestionar/[appointmentId]/      PÚBLICA: el cliente reagenda/cancela
├─ login/page.tsx                       Login del dashboard
└─ api/
   ├─ appointments/                     GET/POST · [id] PATCH/DELETE · availability · reminder
   ├─ cita/[id] · cita/gestionar/[id]   Endpoints públicos
   ├─ auth/ (login, me, logout)         Sesión JWT
   ├─ leads/                            Búsqueda de clientes para el BookingModal
   └─ cron/reminders/                   Cron diario de recordatorios

components/
├─ dashboard/  AppointmentCalendar · AppointmentsList · BookingModal ·
│              AppointmentEditModal · DashboardTabs · charts/AppointmentsStatus
├─ public/     Navbar · CitaClienteForm · GestionarCitaForm
├─ Modal.tsx · SlotPicker.tsx          Reutilizables

lib/
├─ appointments.ts   Reglas (franjas, festivos España+C.Valenciana, 24 h, formato)
├─ supabase.ts       Cliente service-role + tipos
├─ jwt.ts / auth.ts  Sesión (jose) + bcrypt
├─ resend.ts / emails.ts  Cliente Resend + plantillas de email
├─ appointment-service.ts Helpers de datos (disponibilidad, conflictos)
└─ http.ts           Helpers de respuesta

proxy.ts             Protección de /dashboard (convención `proxy` de Next 16)
vercel.json          Cron
db/schema.sql · db/seed.sql
```

---

## 5. Reglas de negocio

- **10 franjas fijas** de 08:00 a 17:00 (de hora en hora).
- **Días laborables**: no fines de semana ni festivos (nacionales de España +
  Viernes Santo + Comunitat Valenciana). Ajusta la lista en `lib/appointments.ts`
  para otra región.
- **Una cita por franja** (conflicto → HTTP 409).
- **Cancelación lógica** (nunca se borra la fila; el hueco se libera).
- **Regla de 24 h**: el cliente solo puede reagendar/cancelar online si faltan
  más de 24 h. El equipo puede modificar siempre desde el dashboard.
- Todo el cálculo de fechas se fija a **`Europe/Madrid`**.

## 6. Seguridad

- La **service role key** solo se usa server-side (nunca llega al navegador).
- `/dashboard/*` está protegido por `proxy.ts`; las rutas internas
  `/api/appointments/*` verifican la sesión en cada handler. Las rutas
  `/api/cita/*` son públicas (control de acceso = enlace con UUID no adivinable
  + regla de 24 h).
- El cron está protegido por `CRON_SECRET`.
