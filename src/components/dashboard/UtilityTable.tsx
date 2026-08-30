import { formatPeso } from "@/lib/format";
import type { UtilityRow } from "@/types/dashboard";

interface UtilityTableProps {
  utilities: UtilityRow[];
}

function profitClass(value: number): string {
  if (value > 0) return "bg-emerald-500 text-white";
  if (value < 0) return "bg-red-500 text-white";
  return "bg-gray-400 text-white";
}

function formatProfit(value: number): string {
  const prefix = value > 0 ? "+ " : value < 0 ? "- " : "";
  return `${prefix}${formatPeso(Math.abs(value))}`;
}

export function UtilityTable({ utilities }: UtilityTableProps) {
  const totals = utilities.reduce(
    (acc, row) => ({
      actualCost: acc.actualCost + row.actualCost,
      tenantPaid: acc.tenantPaid + row.tenantPaid,
      profitLoss: acc.profitLoss + row.profitLoss,
    }),
    { actualCost: 0, tenantPaid: 0, profitLoss: 0 },
  );

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-0 table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[26%]" />
          <col className="w-[26%]" />
          <col className="w-[22%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-3 pr-2 font-medium text-gray-500">Utility</th>
            <th className="pb-3 pr-2 font-medium text-gray-500 whitespace-nowrap">
              Actual Cost
            </th>
            <th className="pb-3 pr-2 font-medium text-gray-500 whitespace-nowrap">
              Tenant Paid
            </th>
            <th className="pb-3 text-right font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {utilities.map((row) => (
            <tr
              key={row.utility}
              className="border-b border-gray-50 last:border-0"
            >
              <td className="py-4 pr-2 font-medium text-navy">{row.utility}</td>
              <td className="py-4 pr-2 text-gray-700 whitespace-nowrap">
                {formatPeso(row.actualCost)}
              </td>
              <td className="py-4 pr-2 text-gray-700 whitespace-nowrap">
                {formatPeso(row.tenantPaid)}
              </td>
              <td className="py-4 text-right">
                <span
                  className={`inline-flex max-w-full whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${profitClass(row.profitLoss)}`}
                >
                  {formatProfit(row.profitLoss)}
                </span>
              </td>
            </tr>
          ))}
          <tr className="border-t border-gray-200 bg-gray-50/60 font-semibold">
            <td className="py-4 pr-2 text-navy">Total</td>
            <td className="py-4 pr-2 text-navy whitespace-nowrap">
              {formatPeso(totals.actualCost)}
            </td>
            <td className="py-4 pr-2 text-navy whitespace-nowrap">
              {formatPeso(totals.tenantPaid)}
            </td>
            <td className="py-4 text-right">
              <span
                className={`inline-flex max-w-full whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${profitClass(totals.profitLoss)}`}
              >
                {formatProfit(totals.profitLoss)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
