import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isWorkday, isPastDate, freeSlots } from '@/lib/appointments';
import { bookedSlots } from '@/lib/appointment-service';
import { err, unauthorized } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/appointments/availability?date=YYYY-MM-DD */
export async function GET(req: Request) {
  if (!(await getCurrentUser())) return unauthorized();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  if (!date) return err('Falta el parámetro date', 400);

  if (isPastDate(date) || !isWorkday(date)) {
    return NextResponse.json({ isWorkday: false, slots: [], booked: [] });
  }

  try {
    const booked = await bookedSlots(date);
    return NextResponse.json({ isWorkday: true, slots: freeSlots(booked), booked });
  } catch (e) {
    console.error('[GET availability]', e);
    return err('Error al consultar disponibilidad', 500);
  }
}
