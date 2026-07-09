"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, EmptyState, Badge } from "@/components/ui/primitives";
import { TransactionForm } from "@/components/holdings/TransactionForm";
import { softDelete } from "@/app/actions";
import { useReadonly } from "@/components/ReadonlyContext";
import type { TransactionRow } from "@/db/queries";

const CLASS_LABELS: Record<string, string> = {
  ro_stock: "RO Stock",
  us_stock: "US Stock",
  crypto: "Crypto",
  reit: "REIT",
  mutual_fund: "Mutual Fund",
  gold: "Gold",
  other: "Other",
};

export function TransactionsClient({ txns }: { txns: TransactionRow[] }) {
  const readonly = useReadonly();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionRow | undefined>();
  const [dir, setDir] = useState<"all" | "buy" | "sell">("all");
  const [cls, setCls] = useState<string>("all");
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();

  const classes = useMemo(() => Array.from(new Set(txns.map((t) => t.assetClass))), [txns]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return txns
      .filter((t) => (dir === "all" ? true : t.direction === dir))
      .filter((t) => (cls === "all" ? true : t.assetClass === cls))
      .filter((t) => (needle ? t.symbol.toLowerCase().includes(needle) : true))
      .sort((a, b) => (a.tradeDate < b.tradeDate ? 1 : a.tradeDate > b.tradeDate ? -1 : b.id - a.id));
  }, [txns, dir, cls, q]);

  // Per-transaction P/L via lot matching (per symbol + currency):
  //  • SELL → realized. Each sell first closes the OPEN buy lot whose remaining
  //    quantity equals the sell quantity — i.e. the specific position it closes
  //    (people trade in discrete round-trips: buy a lot, later sell that lot).
  //    If no exact-quantity lot exists, it falls back to consuming the earliest
  //    open lots (FIFO). Cost basis includes each matched lot's buy commission;
  //    the sell's own fees reduce the realized figure.
  //  • BUY  → unrealized on the STILL-OPEN portion (current vs cost); a fully
  //    sold-through buy shows "—".
  const plByTxn = useMemo(() => {
    const out = new Map<number, { pl: number; basis: number } | null>();
    const groups = new Map<string, TransactionRow[]>();
    for (const t of txns) {
      const k = `${t.symbol}|${t.costCurrency}`;
      const g = groups.get(k);
      if (g) g.push(t);
      else groups.set(k, [t]);
    }
    const EPS = 1e-6;
    for (const list of groups.values()) {
      const chron = [...list].sort((a, b) =>
        a.tradeDate < b.tradeDate ? -1 : a.tradeDate > b.tradeDate ? 1 : a.id - b.id,
      );
      // Open buy lots, oldest → newest. origQty/fees let us prorate buy commission.
      const lots: { id: number; qty: number; origQty: number; cost: number; fees: number }[] = [];
      const openQty = new Map<number, number>();
      for (const t of chron) {
        const fees = (t.commission ?? 0) + (t.saleTax ?? 0);
        if (t.direction === "buy") {
          lots.push({ id: t.id, qty: t.quantity, origQty: t.quantity, cost: t.unitCost, fees });
          openQty.set(t.id, t.quantity);
          continue;
        }
        // SELL. Consume `take` from a lot: track cost basis + prorated buy fees.
        let need = t.quantity;
        let basis = 0; // cost of matched shares (incl. buy commission)
        let matched = 0;
        const consume = (i: number) => {
          const lot = lots[i];
          const take = Math.min(lot.qty, need);
          basis += take * lot.cost + lot.fees * (take / lot.origQty);
          matched += take;
          lot.qty -= take;
          openQty.set(lot.id, (openQty.get(lot.id) ?? 0) - take);
          need -= take;
          if (lot.qty <= EPS) lots.splice(i, 1);
        };
        // 1) Specific lot: the most recent open lot with the exact sell quantity.
        let exact = -1;
        for (let i = lots.length - 1; i >= 0; i--) {
          if (Math.abs(lots[i].qty - t.quantity) < 1e-4) {
            exact = i;
            break;
          }
        }
        if (exact >= 0) consume(exact);
        // 2) Fallback: FIFO from the front for whatever remains.
        while (need > EPS && lots.length) consume(0);

        if (matched <= 0) {
          out.set(t.id, null);
          continue;
        }
        const proceeds = matched * t.unitCost; // sell unitCost = sale price / unit
        const pl = proceeds - basis - fees * (matched / t.quantity);
        out.set(t.id, { pl, basis });
      }
      // BUY rows: unrealized only on the quantity still held.
      for (const t of chron) {
        if (t.direction !== "buy") continue;
        const open = openQty.get(t.id) ?? 0;
        const sameCcy = t.priceCurrency === t.costCurrency;
        if (open <= 1e-9 || t.currentPrice <= 0 || t.unitCost <= 0 || !sameCcy) {
          out.set(t.id, null);
          continue;
        }
        const feesProrated = ((t.commission ?? 0) + (t.saleTax ?? 0)) * (open / t.quantity);
        out.set(t.id, {
          pl: open * (t.currentPrice - t.unitCost) - feesProrated,
          basis: open * t.unitCost,
        });
      }
    }
    return out;
  }, [txns]);

  const buys = rows.filter((t) => t.direction === "buy").length;
  const sells = rows.filter((t) => t.direction === "sell").length;

  function onDelete(t: TransactionRow) {
    if (!confirm(`Delete this ${t.symbol} ${t.direction}? It moves to Trash and can be restored.`)) return;
    start(async () => { await softDelete("transaction", t.id); });
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {rows.length} transaction{rows.length === 1 ? "" : "s"} · {buys} buy / {sells} sell
        </p>
        {!readonly && (
          <button
            onClick={() => { setEditing(undefined); setFormOpen(true); }}
            className="focusring flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-black hover:brightness-110"
          >
            <Plus size={15} /> Add transaction
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(["all", "buy", "sell"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDir(d)}
              className={`focusring rounded-lg px-3 py-1.5 text-sm capitalize transition ${dir === d ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-hover"}`}
            >
              {d}
            </button>
          ))}
        </div>
        <select value={cls} onChange={(e) => setCls(e.target.value)} className="rounded-lg border border-border bg-panel px-3 py-1.5 text-sm">
          <option value="all">All classes</option>
          {classes.map((c) => <option key={c} value={c}>{CLASS_LABELS[c] ?? c}</option>)}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search symbol…"
          className="rounded-lg border border-border bg-panel px-3 py-1.5 text-sm"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No transactions match these filters." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-faint">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Dir</th>
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Unit price</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">P/L</th>
                <th className="px-4 py-3 text-right font-medium">Fees</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-border/60 hover:bg-hover/50">
                  <td className="px-4 py-3 text-ink-muted">{t.tradeDate}</td>
                  <td className="px-4 py-3"><Badge tone={t.direction === "sell" ? "loss" : "gain"}>{t.direction}</Badge></td>
                  <td className="px-4 py-3 font-medium">{t.symbol}</td>
                  <td className="px-4 py-3 text-ink-muted">{CLASS_LABELS[t.assetClass] ?? t.assetClass}</td>
                  <td className="tnum px-4 py-3 text-right text-ink-muted">{t.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 })}</td>
                  <td className="tnum px-4 py-3 text-right text-ink-muted">{t.unitCost.toLocaleString("en-US", { maximumFractionDigits: 4 })} {t.costCurrency}</td>
                  <td className="tnum px-4 py-3 text-right">{(t.quantity * t.unitCost).toLocaleString("en-US", { maximumFractionDigits: 2 })} {t.costCurrency}</td>
                  <td className="tnum px-4 py-3 text-right">{(() => {
                    const r = plByTxn.get(t.id);
                    if (!r) return <span className="text-ink-faint">—</span>;
                    const { pl, basis } = r;
                    const pct = basis > 0 ? (pl / basis) * 100 : 0;
                    const tone = pl >= 0 ? "text-gain" : "text-loss";
                    return (
                      <span className={tone}>
                        {pl >= 0 ? "+" : "−"}
                        {Math.abs(pl).toLocaleString("en-US", { maximumFractionDigits: 2 })} {t.costCurrency}
                        <span className="block text-xs opacity-80">{pct >= 0 ? "+" : "−"}{Math.abs(pct).toFixed(1)}%</span>
                      </span>
                    );
                  })()}</td>
                  <td className="tnum px-4 py-3 text-right text-ink-faint">{(() => {
                    const fees = (t.commission ?? 0) + (t.saleTax ?? 0);
                    return fees > 0 ? `${fees.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${t.costCurrency}` : "—";
                  })()}</td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-ink-faint">{t.notes}</td>
                  <td className="px-4 py-3">
                    {!readonly && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditing(t); setFormOpen(true); }} className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-ink" aria-label="Edit"><Pencil size={13} /></button>
                        <button onClick={() => onDelete(t)} disabled={pending} className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-loss" aria-label="Delete"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <TransactionForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} />
    </div>
  );
}
