import type { Metadata } from "next";

export const metadata: Metadata = { title: "Demo · Loans" };

import { LoansClient } from "@/components/loans/LoansClient";
import { DEMO_LOANS, DEMO_LOANS_DUE_SOON, DEMO_NET_WORTH } from "@/lib/demo-fixtures";

// The client component hides its add/edit/delete controls under ReadonlyProvider
// (set by the /demo layout), so this renders as a static read-only walkthrough.
export default function DemoLoansPage() {
  return (
    <LoansClient
      loans={DEMO_LOANS}
      totalNetWorthEur={DEMO_NET_WORTH.totalNetWorthEur}
      dueSoon={DEMO_LOANS_DUE_SOON}
    />
  );
}
