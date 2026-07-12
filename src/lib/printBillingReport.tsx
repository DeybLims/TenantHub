"use client";

import { createRoot } from "react-dom/client";
import {
  BillingExportReport,
  type BillingExportReportProps,
} from "@/components/billing/BillingExportReport";

const PRINT_ROOT_ID = "billing-export-print-root";

export function printBillingReport(props: BillingExportReportProps): void {
  if (typeof document === "undefined") return;

  let container = document.getElementById(PRINT_ROOT_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = PRINT_ROOT_ID;
    container.className = "hidden print:block";
    document.body.appendChild(container);
  }

  const root = createRoot(container);
  root.render(<BillingExportReport {...props} />);

  requestAnimationFrame(() => {
    window.print();
    root.unmount();
  });
}
