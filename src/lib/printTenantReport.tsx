"use client";

import { createRoot } from "react-dom/client";
import { TenantExportReport } from "@/components/tenants/TenantExportReport";
import type { Tenant } from "@/components/tenants/types";

const PRINT_ROOT_ID = "tenant-export-print-root";

export function printTenantReport(tenant: Tenant): void {
  if (typeof document === "undefined") return;

  let container = document.getElementById(PRINT_ROOT_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = PRINT_ROOT_ID;
    container.className = "hidden print:block";
    document.body.appendChild(container);
  }

  const root = createRoot(container);
  root.render(<TenantExportReport tenant={tenant} />);

  requestAnimationFrame(() => {
    window.print();
    root.unmount();
  });
}
