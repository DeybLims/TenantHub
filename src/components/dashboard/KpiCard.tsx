import type { LucideIcon } from "lucide-react";
import { formatPeso } from "@/lib/format";

export type KpiAccent = "blue" | "orange" | "coral" | "emerald";

const accentStyles: Record<
  KpiAccent,
  { iconBg: string; iconColor: string }
> = {
  blue: {
    iconBg: "bg-blue-100",
    iconColor: "text-brand-blue",
  },
  orange: {
    iconBg: "bg-orange-100",
    iconColor: "text-brand-orange",
  },
  coral: {
    iconBg: "bg-red-100",
    iconColor: "text-brand-coral",
  },
  emerald: {
    iconBg: "bg-emerald-100",
    iconColor: "text-brand-emerald",
  },
};

interface KpiCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: KpiAccent;
}

export function KpiCard({ label, value, icon: Icon, accent }: KpiCardProps) {
  const styles = accentStyles[accent];

  return (
    <article className="rounded-xl bg-surface-card p-5 shadow-card">
      <div
        className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${styles.iconBg}`}
      >
        <Icon className={`h-5 w-5 ${styles.iconColor}`} aria-hidden />
      </div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
        {formatPeso(value)}
      </p>
    </article>
  );
}
