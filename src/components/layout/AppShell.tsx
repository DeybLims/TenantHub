"use client";

import { FileText, KeyRound, LayoutGrid, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Tenants", href: "/tenants", icon: Users },
  { label: "Billing", href: "#", icon: FileText },
  { label: "Expenses", href: "#", icon: Wallet },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface">
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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
