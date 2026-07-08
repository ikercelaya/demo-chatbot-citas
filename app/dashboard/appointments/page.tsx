import { redirect } from 'next/navigation';

export default function OldAppointmentsRoute() {
  redirect('/dashboard/conversations');
}
