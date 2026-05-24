import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

interface DashboardLayoutProps {
  monthSelector: ReactNode;
  children: ReactNode;
}

export function DashboardLayout({
  monthSelector,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-surface">
      <DashboardHeader monthSelector={monthSelector} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="dashboard-grid">{children}</div>
      </main>
    </div>
  );
}
