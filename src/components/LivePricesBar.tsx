"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Radio } from "lucide-react";
import { updatePrices } from "@/app/actions";
import { useReadonly } from "@/components/ReadonlyContext";

/**
 * Fetches live prices for all holding symbols every 90s, persists them to the DB
 * (so net worth + holdings recompute consistently server-side), then refreshes
 * the route. Drop it at the top of any page that should feel "live".
 */
export function LivePricesBar() {
  const readonly = useReadonly();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [stat, setStat] = useState<{ got: number; total: number } | null>(null);
  const running = useRef(false);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setLoading(true);
    try {
      const sres = await fetch("/api/holdings-symbols", { cache: "no-store" });
      const { items } = (await sres.json()) as { items?: { symbol: string; assetClass: string }[] };
      if (!items || items.length === 0) return;
      const pres = await fetch("/api/prices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const { quotes } = (await pres.json()) as { quotes?: { symbol: string; assetClass: string; price: number | null }[] };
      const updates = (quotes ?? [])
        .filter((q) => q.price != null && isFinite(q.price))
        .map((q) => ({ symbol: q.symbol, assetClass: q.assetClass, currentPrice: q.price as number }));
      if (updates.length) {
        await updatePrices(updates);
        setUpdatedAt(new Date());
        setStat({ got: updates.length, total: items.length });
        router.refresh();
      }
    } catch {
      // ignore — keep last good values
    } finally {
      running.current = false;
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (readonly) return; // no live price writes in a shared read-only view
    run();
    const id = setInterval(run, 90_000);
    return () => clearInterval(id);
  }, [run, readonly]);

  // Shared read-only views don't poll or persist prices, so hide the bar.
  if (readonly) return null;

  const time = updatedAt
    ? updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-panel px-3 py-2 text-xs">
      <span className="flex items-center gap-1.5 text-ink-muted">
        <Radio size={13} className={`${loading ? "animate-pulse text-accent" : "text-gain"}`} />
        Live prices · auto-refresh every 90s
        {time && <span className="text-ink-faint">· updated {time}{stat ? ` (${stat.got}/${stat.total})` : ""}</span>}
      </span>
      <button
        onClick={run}
        disabled={loading}
        className="focusring rounded-lg p-1 text-ink-faint hover:bg-hover hover:text-ink disabled:opacity-50"
        title="Refresh now"
      >
        <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
      </button>
    </div>
  );
}
