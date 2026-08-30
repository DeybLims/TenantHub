import { Suspense } from "react";
import { BillingPage } from "@/components/billing/BillingPage";

export default function BillingRoute() {
  return (
    <Suspense fallback={null}>
      <BillingPage />
    </Suspense>
  );
}
