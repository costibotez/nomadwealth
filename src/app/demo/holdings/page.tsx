import { HoldingsClient } from "@/components/holdings/HoldingsClient";
import { DEMO_HOLDINGS } from "@/lib/demo-fixtures";

export default function DemoHoldingsPage() {
  return <HoldingsClient classes={DEMO_HOLDINGS} />;
}
