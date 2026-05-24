import { Calendar, ChevronDown } from "lucide-react";
import type { MonthOption } from "@/types/dashboard";

interface MonthSelectProps {
  months: MonthOption[];
  value: string;
  onChange: (month: string) => void;
  disabled?: boolean;
}

export function MonthSelect({
  months,
  value,
  onChange,
  disabled,
}: MonthSelectProps) {
  return (
    <div className="relative">
      <Calendar
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        aria-hidden
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || months.length === 0}
        className="appearance-none rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Select billing month"
      >
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
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
