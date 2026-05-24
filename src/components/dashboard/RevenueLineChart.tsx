"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { RevenueTrendPoint } from "@/types/dashboard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

interface RevenueLineChartProps {
  data: RevenueTrendPoint[];
}

export function RevenueLineChart({ data }: RevenueLineChartProps) {
  const chartData = {
    labels: data.map((d) => d.month),
    datasets: [
      {
        label: "Revenue",
        data: data.map((d) => d.revenue),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e2a4a",
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6b7280", font: { size: 12 } },
      },
      y: {
        grid: { color: "#e5e7eb" },
        ticks: {
          color: "#6b7280",
          font: { size: 12 },
          callback: (value: string | number) =>
            `₱${Number(value).toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div className="h-[260px] w-full sm:h-[280px]">
      <Line data={chartData} options={options} />
    </div>
  );
}
