import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-semibold text-orange-700">
          🛠️ Renoveplac · Reformas integrales
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Módulo de citas y visitas técnicas
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-600">
          Sistema completo para agendar, gestionar y recordar visitas técnicas.
          El cliente reserva desde un enlace propio; el equipo gestiona todo
          desde un panel con calendario, lista y recordatorios automáticos.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-orange-700"
          >
            Entrar al panel →
          </Link>
          <a
            href="https://code.claude.com/docs/en/claude-code-on-the-web"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Documentación
          </a>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { icon: '📅', title: 'Calendario y lista', body: 'KPIs, gráfico de estados y vista mensual o de tabla con filtros.' },
            { icon: '🔗', title: 'Auto-agendado', body: 'El cliente elige día y hora desde un enlace único, sin login.' },
            { icon: '⏰', title: 'Recordatorios', body: 'Un cron diario avisa de las visitas de mañana al cliente y al equipo.' },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-2xl">{c.icon}</div>
              <h3 className="mt-2 font-semibold text-gray-900">{c.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{c.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 text-sm text-gray-400">
          Configura tus variables de entorno (Supabase, Resend, JWT, Cron) antes
          de usar el módulo. Ver <code className="rounded bg-gray-100 px-1.5 py-0.5">.env.example</code>.
        </p>
      </div>
    </main>
  );
}
