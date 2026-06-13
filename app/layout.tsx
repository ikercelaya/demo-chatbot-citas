import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Renoveplac · Reformas integrales',
  description: 'Módulo de gestión de citas y visitas técnicas.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
