"use client";

import { CloudDownload, FileText, KeyRound, LayoutGrid, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Tenants", href: "/tenants", icon: Users },
  { label: "Billing", href: "/billing", icon: FileText },
  { label: "Expenses", href: "/expenses", icon: Wallet },
];

interface DashboardHeaderProps {
  monthSelector: ReactNode;
  onDownloadReport?: () => void;
  downloadDisabled?: boolean;
}

export function DashboardHeader({
  monthSelector,
  onDownloadReport,
  downloadDisabled,
}: DashboardHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-gradient-to-r from-brand-blue to-brand-blue-dark">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6">
          <KeyRound className="h-6 w-6 text-white" aria-hidden />
          <span className="text-lg font-semibold text-white">TenantHub</span>
        </div>
      </div>

      <nav
        className="border-b border-gray-200 bg-white"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);

            return (
              <Link
                key={label}
                href={href}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand-blue text-brand-blue"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-b border-gray-200 bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Dashboard</h1>
          <div className="flex flex-wrap items-center gap-3">
            {monthSelector}
            <button
              type="button"
              onClick={onDownloadReport}
              disabled={downloadDisabled}
              className="inline-flex items-center gap-2 rounded-full bg-brand-emerald px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CloudDownload className="h-4 w-4" aria-hidden />
              Download Report
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
