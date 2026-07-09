import { WatchlistClient } from "@/components/watchlist/WatchlistClient";
import { DEMO_WATCHLIST, DEMO_ALERTS } from "@/lib/demo-fixtures";

export default function DemoWatchlistPage() {
  return <WatchlistClient items={DEMO_WATCHLIST} alerts={DEMO_ALERTS} />;
}
