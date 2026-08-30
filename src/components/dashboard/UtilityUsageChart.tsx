"use client";

import { useState } from "react";
import { formatPeso } from "@/lib/format";
import type { UtilityUsageSeries } from "@/types/dashboard";

interface UtilityUsageChartProps {
  title: string;
  series: UtilityUsageSeries;
}

type ViewMode = "monthly" | "yearly";

export function UtilityUsageChart({ title, series }: UtilityUsageChartProps) {
  const [view, setView] = useState<ViewMode>("monthly");
  const points = view === "monthly" ? series.monthly : series.yearly;
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <article className="rounded-xl bg-surface-card p-5 shadow-card lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-gray-500">{title}</h2>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setView("monthly")}
            className={`rounded-md px-3 py-1.5 ${
              view === "monthly"
                ? "bg-blue-500 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setView("yearly")}
            className={`rounded-md px-3 py-1.5 ${
              view === "yearly"
                ? "bg-blue-500 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {points.map((point) => (
            <div key={point.label} className="grid grid-cols-[72px_1fr_auto] items-center gap-3">
              <span className="text-xs font-medium text-gray-500">
                {point.label}
              </span>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ width: `${(point.value / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-navy">
                {formatPeso(point.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
