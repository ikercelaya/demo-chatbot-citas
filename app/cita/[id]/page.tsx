import CitaClienteForm from '@/components/public/CitaClienteForm';

export default async function CitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CitaClienteForm id={id} />;
}
