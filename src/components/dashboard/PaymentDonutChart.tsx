"use client";

import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { PaymentStatus } from "@/types/dashboard";
import { formatPeso } from "@/lib/format";

ChartJS.register(ArcElement, Tooltip, Legend);

interface PaymentDonutChartProps {
  paymentStatus: PaymentStatus;
}

export function PaymentDonutChart({ paymentStatus }: PaymentDonutChartProps) {
  const { collected, outstanding } = paymentStatus;

  const chartData = {
    labels: ["Collection", "Outstanding"],
    datasets: [
      {
        data: [collected, outstanding],
        backgroundColor: ["#2563eb", "#ef4444"],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e2a4a",
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="h-[200px] w-[200px] shrink-0">
        <Doughnut data={chartData} options={options} />
      </div>
      <div className="space-y-4 text-center sm:text-left">
        <div>
          <p className="text-sm font-medium text-brand-blue">Collection</p>
          <p className="text-2xl font-bold text-brand-blue">
            {formatPeso(collected)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-brand-coral">Outstanding</p>
          <p className="text-2xl font-bold text-brand-coral">
            {formatPeso(outstanding)}
          </p>
        </div>
      </div>
    </div>
  );
}
