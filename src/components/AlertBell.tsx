"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing } from "lucide-react";
import { acknowledgeAlerts } from "@/app/actions";

export function AlertBell() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [priceCount, setPriceCount] = useState(0);
  const [loanCount, setLoanCount] = useState(0);
  const [, start] = useTransition();

  async function load() {
    try {
      const res = await fetch("/api/alerts/triggered", { cache: "no-store" });
      const data = (await res.json()) as { count?: number; priceCount?: number; loanCount?: number };
      setCount(data.count ?? 0);
      setPriceCount(data.priceCount ?? 0);
      setLoanCount(data.loanCount ?? 0);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  function onClick() {
    // Loan dues take priority for routing; only price alerts get acknowledged.
    router.push(loanCount > 0 && priceCount === 0 ? "/dashboard/loans" : "/dashboard/watchlist");
    if (priceCount > 0) {
      start(async () => {
        await acknowledgeAlerts();
        setPriceCount(0);
        setCount(loanCount);
      });
    }
  }

  const title =
    count > 0
      ? [
          priceCount > 0 ? `${priceCount} price alert${priceCount > 1 ? "s" : ""}` : null,
          loanCount > 0 ? `${loanCount} loan payment${loanCount > 1 ? "s" : ""} due` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "Alerts";

  return (
    <button
      onClick={onClick}
      title={title}
      className="focusring relative rounded-xl border border-border bg-panel p-2 text-ink-faint hover:bg-hover hover:text-ink"
    >
      {count > 0 ? <BellRing size={16} className="text-accent" /> : <Bell size={16} />}
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-black">
          {count}
        </span>
      )}
    </button>
  );
}
