import DashboardTabs from '@/components/dashboard/DashboardTabs';

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardTabs />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
