import { formatLongDate, formatPesoDecimal } from "@/lib/format";
import type { RecentActivityItem } from "@/types/dashboard";

interface RecentActivityListProps {
  items: RecentActivityItem[];
}

export function RecentActivityList({ items }: RecentActivityListProps) {
  return (
    <article className="rounded-xl bg-surface-card p-5 shadow-card lg:p-6">
      <h2 className="mb-4 text-sm font-medium text-gray-500">Recent Activity</h2>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          No recent activity for this period.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-navy">
                  {item.unitCode}{" "}
                  <span className="font-normal text-gray-500">
                    · {item.tenantName}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {item.type === "payment" ? "Payment received" : "Bill generated"}
                  {" · "}
                  {formatLongDate(item.date)}
                </p>
              </div>
              <p
                className={`shrink-0 text-sm font-semibold ${
                  item.type === "payment" ? "text-emerald-600" : "text-navy"
                }`}
              >
                {formatPesoDecimal(item.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
