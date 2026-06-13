'use client';

import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { ESTADO_CITA_STYLES, type EstadoCita } from '@/lib/appointments';
import type { AppointmentWithRelations } from '@/lib/supabase';

const ORDER: EstadoCita[] = ['pendiente', 'confirmada', 'completada', 'cancelada'];

export default function AppointmentsStatus({
  appointments,
}: {
  appointments: AppointmentWithRelations[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const counts = ORDER.map((e) => appointments.filter((a) => a.estado === e).length);
  const total = appointments.length;
  const completadas = appointments.filter((a) => a.estado === 'completada').length;
  const tasa = total ? Math.round((completadas / total) * 100) : 0;
  const dataKey = counts.join('-');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const data = ORDER.map((e) => appointments.filter((a) => a.estado === e).length);
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ORDER.map((e) => ESTADO_CITA_STYLES[e].label),
        datasets: [
          {
            data,
            backgroundColor: ORDER.map((e) => ESTADO_CITA_STYLES[e].hex),
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 8, padding: 14, font: { size: 11 } },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700">Distribución por estado</h3>
      <div className="relative mx-auto mt-2 h-52">
        <canvas ref={canvasRef} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-10">
          <div className="text-2xl font-bold text-gray-900">{tasa}%</div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400">completadas</div>
        </div>
      </div>
    </div>
  );
}
