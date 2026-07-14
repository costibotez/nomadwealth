import type { Metadata } from "next";

export const metadata: Metadata = { title: "Demo · Dividends" };

import { DividendsClient } from "@/components/dividends/DividendsClient";
import { DEMO_DIVIDENDS } from "@/lib/demo-fixtures";

// The client component hides its add/edit/delete controls under ReadonlyProvider
// (set by the /demo layout), so this renders as a static read-only walkthrough.
export default function DemoDividendsPage() {
  return <DividendsClient model={DEMO_DIVIDENDS} />;
}
