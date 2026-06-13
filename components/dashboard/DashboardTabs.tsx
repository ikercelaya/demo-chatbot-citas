'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface Tab {
  href: string;
  label: string;
  icon: string;
  match: (p: string) => boolean;
}

const TABS: Tab[] = [
  {
    href: '/dashboard/appointments',
    label: 'Citas',
    icon: '📅',
    match: (p) => p.startsWith('/dashboard/appointments'),
  },
];

export default function DashboardTabs() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard/appointments"
            className="flex items-center gap-2 py-3 text-base font-bold text-gray-900"
          >
            <span className="text-lg text-orange-600">●</span> Renoveplac
          </Link>
          <nav className="flex gap-1">
            {TABS.map((t) => {
              const active = t.match(pathname);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span aria-hidden>{t.icon}</span>
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          onClick={logout}
          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
