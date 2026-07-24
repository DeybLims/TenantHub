"use client";

import { createRoot, type Root } from "react-dom/client";
import { TenantExportReport } from "@/components/tenants/TenantExportReport";
import type { Tenant } from "@/components/tenants/types";

const PRINT_ROOT_ID = "tenant-export-print-root";

let activeRoot: Root | null = null;

function cleanupPrintRoot(): void {
  if (activeRoot) {
    activeRoot.unmount();
    activeRoot = null;
  }
  const container = document.getElementById(PRINT_ROOT_ID);
  if (container) {
    container.remove();
  }
}

export function printTenantReport(tenant: Tenant): void {
  if (typeof document === "undefined") return;

  cleanupPrintRoot();

  const container = document.createElement("div");
  container.id = PRINT_ROOT_ID;
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);

  activeRoot = createRoot(container);
  activeRoot.render(<TenantExportReport tenant={tenant} />);

  const handleAfterPrint = () => {
    window.removeEventListener("afterprint", handleAfterPrint);
    cleanupPrintRoot();
  };

  window.addEventListener("afterprint", handleAfterPrint);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
      window.setTimeout(() => {
        if (document.getElementById(PRINT_ROOT_ID)) {
          handleAfterPrint();
        }
      }, 60_000);
    });
  });
}
