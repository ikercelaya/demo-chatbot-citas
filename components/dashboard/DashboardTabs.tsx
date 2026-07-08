'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname.startsWith('/dashboard/conversations');

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard/conversations" className="py-4 text-base font-black text-neutral-950">
            Pro Strength Irun
          </Link>
          <nav className="flex gap-1">
            <Link
              href="/dashboard/conversations"
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                active ? 'bg-red-50 text-red-700' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Conversaciones
            </Link>
          </nav>
        </div>
        <button
          onClick={logout}
          className="rounded-lg px-3 py-2 text-sm font-bold text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
