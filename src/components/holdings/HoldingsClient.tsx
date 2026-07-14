"use client";

import { Fragment, useState, useTransition } from "react";
import { ChevronRight, Plus, Pencil, Trash2, Tag, CalendarClock } from "lucide-react";
import { Money, MoneyDelta, Pct } from "@/components/ui/money";
import { Card, EmptyState, Badge } from "@/components/ui/primitives";
import { Modal, Field, inputClass } from "@/components/ui/Modal";
import { TransactionForm } from "./TransactionForm";
import { softDelete, updatePrices } from "@/app/actions";
import { useReadonly } from "@/components/ReadonlyContext";
import type { TransactionRow } from "@/db/queries";

interface SymbolHolding {
  symbol: string;
  assetClass: string;
  quantity: number;
  avgCost: number;
  investedEur: number;
  currentValueEur: number;
  unrealizedPlEur: number;
  unrealizedPct: number | null;
  avgHoldingDays: number | null;
  maturityDate: string | null;
  lots: TransactionRow[];
}
interface ClassHolding {
  assetClass: string;
  label: string;
  investedEur: number;
  currentValueEur: number;
  unrealizedPlEur: number;
  unrealizedPct: number | null;
  symbols: SymbolHolding[];
}

function daysTo(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function HoldingsClient({ classes }: { classes: ClassHolding[] }) {
  const readonly = useReadonly();
  const [tab, setTab] = useState(classes[0]?.assetClass ?? "ro_stock");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionRow | undefined>();
  const [pricesOpen, setPricesOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const active = classes.find((c) => c.assetClass === tab);

  function onDelete(t: TransactionRow) {
    if (!confirm(`Delete this ${t.symbol} lot? It moves to Trash and can be restored.`)) return;
    start(async () => {
      await softDelete("transaction", t.id);
    });
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {classes.map((c) => (
            <button
              key={c.assetClass}
              onClick={() => setTab(c.assetClass)}
              className={`focusring rounded-lg px-3 py-1.5 text-sm transition ${
                tab === c.assetClass ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-hover"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {!readonly && (
          <div className="flex gap-2">
            <button
              onClick={() => setPricesOpen(true)}
              className="focusring flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-hover"
            >
              <Tag size={15} /> Update prices
            </button>
            <button
              onClick={() => { setEditing(undefined); setFormOpen(true); }}
              className="focusring flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-black hover:brightness-110"
            >
              <Plus size={15} /> Add transaction
            </button>
          </div>
        )}
      </div>

      {!active || active.symbols.length === 0 ? (
        <EmptyState message="No holdings in this class yet." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-faint">
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Avg cost</th>
                <th className="px-4 py-3 text-right font-medium">Invested</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
                <th className="px-4 py-3 text-right font-medium">P/L</th>
                <th className="px-4 py-3 text-right font-medium">%</th>
                <th className="px-4 py-3 text-right font-medium">% class</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {active.symbols.map((s) => {
                const key = `${s.assetClass}:${s.symbol}`;
                const open = expanded === key;
                const pctClass = active.currentValueEur ? s.currentValueEur / active.currentValueEur : 0;
                return (
                  <Fragment key={key}>
                    <tr
                      className="cursor-pointer border-b border-border/60 hover:bg-hover/50"
                      onClick={() => setExpanded(open ? null : key)}
                    >
                      <td className="px-4 py-3 font-medium">
                        <span className="flex items-center gap-1.5">
                          <ChevronRight size={14} className={`text-ink-faint transition-transform ${open ? "rotate-90" : ""}`} />
                          {s.symbol}
                          {s.maturityDate && (
                            <Badge tone="accent">
                              <CalendarClock size={11} className="mr-1" />
                              {daysTo(s.maturityDate)}d to exit
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="tnum px-4 py-3 text-right text-ink-muted">{s.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 })}</td>
                      <td className="tnum px-4 py-3 text-right text-ink-muted">{s.avgCost.toLocaleString("en-US", { maximumFractionDigits: 4 })}</td>
                      <td className="px-4 py-3 text-right"><Money eur={s.investedEur} /></td>
                      <td className="px-4 py-3 text-right"><Money eur={s.currentValueEur} /></td>
                      <td className="px-4 py-3 text-right"><MoneyDelta eur={s.unrealizedPlEur} /></td>
                      <td className="px-4 py-3 text-right"><Pct value={s.unrealizedPct} /></td>
                      <td className="tnum px-4 py-3 text-right text-ink-faint">{(pctClass * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right text-ink-faint">{s.avgHoldingDays ?? "—"}d</td>
                    </tr>
                    {open &&
                      s.lots.map((lot) => (
                        <tr key={lot.id} className="border-b border-border/40 bg-panel/40 text-xs">
                          <td className="px-4 py-2 pl-10 text-ink-muted">
                            <span className="flex items-center gap-1.5">
                              <Badge tone={lot.direction === "sell" ? "loss" : "gain"}>{lot.direction}</Badge>
                              {lot.tradeDate}
                            </span>
                          </td>
                          <td className="tnum px-4 py-2 text-right text-ink-faint">{lot.quantity}</td>
                          <td className="tnum px-4 py-2 text-right text-ink-faint">{lot.unitCost} {lot.costCurrency}</td>
                          <td className="tnum px-4 py-2 text-right text-ink-faint" colSpan={2}>
                            @ {lot.currentPrice} {lot.priceCurrency}
                          </td>
                          <td colSpan={3} className="px-4 py-2 text-ink-faint">{lot.notes}</td>
                          <td className="px-4 py-2">
                            {!readonly && (
                              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => { setEditing(lot); setFormOpen(true); }} className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-ink" aria-label="Edit">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => onDelete(lot)} disabled={pending} className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-loss" aria-label="Delete">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border text-sm font-medium">
                <td className="px-4 py-3" colSpan={3}>Total — {active.label}</td>
                <td className="px-4 py-3 text-right"><Money eur={active.investedEur} /></td>
                <td className="px-4 py-3 text-right"><Money eur={active.currentValueEur} /></td>
                <td className="px-4 py-3 text-right"><MoneyDelta eur={active.unrealizedPlEur} /></td>
                <td className="px-4 py-3 text-right"><Pct value={active.unrealizedPct} /></td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        defaultAssetClass={tab}
      />
      {pricesOpen && (
        <UpdatePricesModal classes={classes} onClose={() => setPricesOpen(false)} />
      )}
    </div>
  );
}

function UpdatePricesModal({ classes, onClose }: { classes: ClassHolding[]; onClose: () => void }) {
  const rows = classes.flatMap((c) =>
    c.symbols.map((s) => ({
      symbol: s.symbol,
      assetClass: s.assetClass,
      label: c.label,
      price: s.lots[0]?.currentPrice ?? 0,
      currency: s.lots[0]?.priceCurrency ?? "USD",
    })),
  );
  const [vals, setVals] = useState<Record<string, number>>(
    Object.fromEntries(rows.map((r) => [`${r.assetClass}:${r.symbol}`, r.price])),
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [updatedKeys, setUpdatedKeys] = useState<Set<string>>(new Set());

  async function fetchLive() {
    setFetching(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: rows.map((r) => ({ symbol: r.symbol, assetClass: r.assetClass })) }),
      });
      const data = (await res.json()) as {
        quotes?: { key: string; price: number | null }[];
      };
      const next: Record<string, number> = {};
      const updated = new Set<string>();
      let got = 0;
      for (const q of data.quotes ?? []) {
        if (q.price != null && isFinite(q.price)) {
          next[q.key] = q.price;
          updated.add(q.key);
          got++;
        }
      }
      setVals((v) => ({ ...v, ...next }));
      setUpdatedKeys(updated);
      setNote(`Updated ${got} of ${rows.length} symbols. REITs, funds & gold have no live source — set those manually. Review, then Save.`);
    } catch {
      setError("Live fetch failed. Try again, or enter prices manually.");
    } finally {
      setFetching(false);
    }
  }

  function save() {
    setError(null);
    const updates = rows.map((r) => ({
      symbol: r.symbol,
      assetClass: r.assetClass,
      currentPrice: vals[`${r.assetClass}:${r.symbol}`],
    }));
    start(async () => {
      const res = await updatePrices(updates);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <Modal open onClose={onClose} title="Update current prices">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-faint">
          Live: US + BVB stocks (Yahoo), crypto (CoinMarketCap).
        </p>
        <button
          onClick={fetchLive}
          disabled={fetching || pending}
          className="focusring flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent hover:brightness-110 disabled:opacity-50"
        >
          <Tag size={14} className={fetching ? "animate-pulse" : ""} />
          {fetching ? "Fetching…" : "Fetch live prices"}
        </button>
      </div>
      <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
        {rows.map((r) => {
          const key = `${r.assetClass}:${r.symbol}`;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="flex w-40 items-center gap-1.5 truncate text-sm">
                {r.symbol} <span className="text-ink-faint">{r.currency}</span>
                {updatedKeys.has(key) && <span className="h-1.5 w-1.5 rounded-full bg-gain" title="Live updated" />}
              </span>
              <input
                type="number"
                step="any"
                value={vals[key]}
                onChange={(e) => setVals((v) => ({ ...v, [key]: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
          );
        })}
      </div>
      {note && <p className="mt-2 text-xs text-ink-muted">{note}</p>}
      {error && <p className="mt-2 text-sm text-loss">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="focusring rounded-lg border border-border px-4 py-2 text-sm hover:bg-hover">Cancel</button>
        <button onClick={save} disabled={pending} className="focusring rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">
          {pending ? "Saving…" : "Save all"}
        </button>
      </div>
    </Modal>
  );
}
