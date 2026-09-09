import { Calendar, ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { billingMonthsMatch } from "@/lib/months";
import type { MonthOption } from "@/types/dashboard";

interface MonthSelectProps {
  months: MonthOption[];
  value: string;
  onChange: (month: string) => void;
  disabled?: boolean;
  /** Label the latest month as "This Month · {label}" so older months stay visible. */
  useThisMonthLabel?: boolean;
}

export function MonthSelect({
  months,
  value,
  onChange,
  disabled,
  useThisMonthLabel = false,
}: MonthSelectProps) {
  const latestMonth = months.at(-1)?.value;

  const selectedValue = useMemo(() => {
    const match = months.find((month) => billingMonthsMatch(month.value, value));
    return match?.value ?? value;
  }, [months, value]);

  return (
    <div className="relative">
      <Calendar
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        aria-hidden
      />
      <select
        value={selectedValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || months.length === 0}
        className="appearance-none rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Select billing month"
      >
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {useThisMonthLabel &&
            latestMonth &&
            billingMonthsMatch(month.value, latestMonth)
              ? `This Month · ${month.label}`
              : month.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        aria-hidden
      />
    </div>
  );
}
