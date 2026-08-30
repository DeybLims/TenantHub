import { formatPeso } from "@/lib/format";

export type KpiAccent = "blue" | "orange" | "coral" | "emerald";

const accentStyles: Record<KpiAccent, string> = {
  blue: "bg-brand-blue",
  orange: "bg-brand-orange",
  coral: "bg-brand-coral",
  emerald: "bg-brand-emerald",
};

interface KpiCardProps {
  label: string;
  value: number;
  accent: KpiAccent;
}

export function KpiCard({ label, value, accent }: KpiCardProps) {
  return (
    <article className="rounded-xl bg-surface-card p-5 shadow-card">
      <div
        className={`mb-4 h-10 w-10 rounded-lg ${accentStyles[accent]}`}
        aria-hidden
      />
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
        {formatPeso(value)}
      </p>
    </article>
  );
}
