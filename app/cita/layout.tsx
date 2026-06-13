import Navbar from '@/components/public/Navbar';

export default function CitaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
