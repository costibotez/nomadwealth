import { getHoldingsModel } from "@/lib/aggregate";
import { HoldingsClient } from "@/components/holdings/HoldingsClient";
import { LivePricesBar } from "@/components/LivePricesBar";

export const dynamic = "force-dynamic";

export default async function HoldingsPage() {
  const { classes } = await getHoldingsModel();
  return (
    <div className="space-y-4">
      <LivePricesBar />
      <HoldingsClient classes={classes} />
    </div>
  );
}
