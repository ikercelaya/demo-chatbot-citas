import GestionarCitaForm from '@/components/public/GestionarCitaForm';

export default async function GestionarPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  return <GestionarCitaForm appointmentId={appointmentId} />;
}
