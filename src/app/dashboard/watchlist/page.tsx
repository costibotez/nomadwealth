import { getWatchlist, getPriceAlerts } from "@/db/queries";
import { WatchlistClient } from "@/components/watchlist/WatchlistClient";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const [items, alerts] = await Promise.all([getWatchlist(), getPriceAlerts()]);
  return <WatchlistClient items={items} alerts={alerts} />;
}
