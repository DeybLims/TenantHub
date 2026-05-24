import { ChevronDown } from "lucide-react";
import { formatPeso } from "@/lib/format";
import type { UtilityRow } from "@/types/dashboard";

interface UtilityTableProps {
  utilities: UtilityRow[];
}

const statusStyles: Record<UtilityRow["status"], string> = {
  Paid: "bg-brand-emerald text-white",
  Pending: "bg-brand-coral text-white",
  Partial: "bg-brand-orange text-white",
};

export function UtilityTable({ utilities }: UtilityTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-3 pr-4 font-medium text-gray-500">Utility</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Total Bill</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">
              Allocated Amount
            </th>
            <th className="pb-3 pr-4 font-medium text-gray-500">
              Remaining Balance
            </th>
            <th className="pb-3 font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {utilities.map((row) => (
            <tr
              key={row.utility}
              className="border-b border-gray-50 last:border-0"
            >
              <td className="py-4 pr-4 font-medium text-navy">
                {row.utility}
              </td>
              <td className="py-4 pr-4 text-gray-700">
                {formatPeso(row.totalBill)}
              </td>
              <td className="py-4 pr-4 text-gray-700">
                {formatPeso(row.allocatedAmount)}
              </td>
              <td className="py-4 pr-4 text-gray-700">
                {formatPeso(row.remainingBalance)}
              </td>
              <td className="py-4">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[row.status]}`}
                >
                  {row.status}
                  <ChevronDown className="h-3.5 w-3.5 opacity-80" aria-hidden />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
