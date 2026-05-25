import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

interface DashboardLayoutProps {
  monthSelector: ReactNode;
  onDownloadReport?: () => void;
  downloadDisabled?: boolean;
  children: ReactNode;
}

export function DashboardLayout({
  monthSelector,
  onDownloadReport,
  downloadDisabled,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-surface">
      <DashboardHeader
        monthSelector={monthSelector}
        onDownloadReport={onDownloadReport}
        downloadDisabled={downloadDisabled}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="dashboard-grid">{children}</div>
      </main>
    </div>
  );
}
