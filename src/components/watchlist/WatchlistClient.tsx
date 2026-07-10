"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Bell, BellRing, X, RefreshCw, LineChart } from "lucide-react";
import { Card, EmptyState, Badge } from "@/components/ui/primitives";
import { Modal, Field, inputClass } from "@/components/ui/Modal";
import { CandleChart } from "./CandleChart";
import {
  addWatchlistItem,
  deleteWatchlistItem,
  addPriceAlert,
  deletePriceAlert,
  resetPriceAlert,
  checkAlerts,
} from "@/app/actions";
import { useReadonly } from "@/components/ReadonlyContext";

interface Item { id: number; symbol: string; assetClass: string; label: string | null }
interface Alert {
  id: number; symbol: string; assetClass: string; targetPrice: number; currency: string;
  direction: string; active: boolean; triggeredAt: string | null; triggeredPrice: number | null; note: string | null;
}
interface Quote { price: number | null; currency: string | null; changePct: number | null }

const CLASS_GROUPS: { key: string; label: string }[] = [
  { key: "ro_stock", label: "BVB" },
  { key: "us_stock", label: "US Stocks" },
  { key: "crypto", label: "Crypto" },
];
const OTHER = { key: "other", label: "Other" };

function fmtPrice(q: Quote | undefined): string {
  if (!q || q.price == null) return "—";
  const decimals = q.price < 10 ? 4 : 2;
  return q.price.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function WatchlistClient({ items, alerts }: { items: Item[]; alerts: Alert[] }) {
  const readonly = useReadonly();
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, start] = useTransition();
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const refresh = useCallback(async () => {
    const list = itemsRef.current;
    if (list.length === 0) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: list.map((i) => ({ symbol: i.symbol, assetClass: i.assetClass })) }),
      });
      const data = (await res.json()) as { quotes?: { key: string; price: number | null; currency: string | null; changePct: number | null }[] };
      const map: Record<string, Quote> = {};
      const priced: { symbol: string; assetClass: string; price: number }[] = [];
      for (const q of data.quotes ?? []) {
        map[q.key] = { price: q.price, currency: q.currency, changePct: q.changePct };
        const [assetClass, ...rest] = q.key.split(":");
        if (q.price != null) priced.push({ symbol: rest.join(":"), assetClass, price: q.price });
      }
      setQuotes(map);
      // Evaluate alerts against fresh prices. Skipped in read-only shared views
      // (a viewer must not mutate the owner's alert state).
      if (!readonly) {
        const { triggered } = await checkAlerts(priced);
        if (triggered.length) {
          setToast(triggered.map((t) => `${t.symbol} ${t.direction === "above" ? "≥" : "≤"} ${t.targetPrice}`).join(" · "));
          setTimeout(() => setToast(null), 8000);
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [readonly]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 90_000); // auto-refresh every 90s
    return () => clearInterval(id);
  }, [refresh]);

  const groups = [...CLASS_GROUPS, OTHER]
    .map((g) => ({ ...g, rows: items.filter((i) => (g.key === "other" ? !["ro_stock", "us_stock", "crypto"].includes(i.assetClass) : i.assetClass === g.key)) }))
    .filter((g) => g.rows.length > 0);

  const alertsBySymbol = (it: Item) => alerts.filter((a) => a.symbol === it.symbol && a.assetClass === it.assetClass);

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Live quotes · auto-refresh every 90s</p>
        <div className="flex gap-2">
          <button onClick={refresh} className="focusring rounded-lg border border-border bg-panel p-2 text-ink-faint hover:bg-hover hover:text-ink" title="Refresh">
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
          {!readonly && (
            <button onClick={() => setAdding(true)} className="focusring flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-black hover:brightness-110">
              <Plus size={15} /> Add symbol
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState message="Your watchlist is empty. Add BVB, US or crypto symbols to track them." />
      ) : (
        groups.map((g) => (
          <div key={g.key}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{g.label}</h2>
            <Card className="p-0">
              <ul className="divide-y divide-border/60">
                {g.rows.map((it) => {
                  const q = quotes[`${it.assetClass}:${it.symbol}`];
                  const ch = q?.changePct;
                  const sym = it.symbol.replace(/^BVB:/, "");
                  const itemAlerts = alertsBySymbol(it);
                  const triggered = itemAlerts.filter((a) => a.triggeredAt);
                  return (
                    <li
                      key={it.id}
                      onClick={() => setSelected(it)}
                      className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-hover/50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sym}</span>
                          {itemAlerts.length > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-ink-faint">
                              {triggered.length > 0 ? <BellRing size={12} className="text-accent" /> : <Bell size={12} />}
                              {itemAlerts.length}
                            </span>
                          )}
                          <LineChart size={12} className="text-ink-faint" />
                        </div>
                        {it.label && <div className="truncate text-xs text-ink-faint">{it.label}</div>}
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <div className="tnum font-medium">{fmtPrice(q)} <span className="text-xs text-ink-faint">{q?.currency ?? ""}</span></div>
                          <div className={`tnum text-xs ${ch == null ? "text-ink-faint" : ch >= 0 ? "text-gain" : "text-loss"}`}>
                            {ch == null ? "" : `${ch >= 0 ? "+" : ""}${(ch * 100).toFixed(2)}%`}
                          </div>
                        </div>
                        {!readonly && (
                          <button
                            onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${sym} from watchlist?`)) start(async () => { await deleteWatchlistItem(it.id); }); }}
                            className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-loss"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        ))
      )}

      {adding && <AddSymbolForm onClose={() => setAdding(false)} />}
      {selected && (
        <SymbolDrawer
          item={selected}
          quote={quotes[`${selected.assetClass}:${selected.symbol}`]}
          alerts={alertsBySymbol(selected)}
          onClose={() => setSelected(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-xl border border-accent/40 bg-raised px-4 py-3 text-sm shadow-card">
          <span className="flex items-center gap-2"><BellRing size={16} className="text-accent" /> Alert: {toast}</span>
        </div>
      )}
    </div>
  );
}

function AddSymbolForm({ onClose }: { onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = Object.fromEntries(new FormData(e.currentTarget).entries());
    start(async () => {
      const res = await addWatchlistItem(input);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }
  return (
    <Modal open onClose={onClose} title="Add symbol">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Asset class">
          <select name="assetClass" defaultValue="us_stock" className={inputClass}>
            <option value="ro_stock">BVB (RO stock)</option>
            <option value="us_stock">US stock</option>
            <option value="crypto">Crypto</option>
          </select>
        </Field>
        <Field label="Symbol">
          <input name="symbol" required placeholder="META · BVB:TLV · BTC" className={inputClass} />
        </Field>
        <Field label="Label (optional)">
          <input name="label" placeholder="Meta Platforms" className={inputClass} />
        </Field>
        <p className="text-xs text-ink-faint">
          BVB symbols use the <code>BVB:</code> prefix (e.g. <code>BVB:TLV</code>). Crypto uses the ticker (e.g. <code>BTC</code>).
        </p>
        {error && <p className="text-sm text-loss">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="focusring rounded-lg border border-border px-4 py-2 text-sm hover:bg-hover">Cancel</button>
          <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">{pending ? "Adding…" : "Add"}</button>
        </div>
      </form>
    </Modal>
  );
}

function SymbolDrawer({ item, quote, alerts, onClose }: { item: Item; quote?: Quote; alerts: Alert[]; onClose: () => void }) {
  const readonly = useReadonly();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Portal to <body>: the watchlist root has `animate-fade-up`, whose settled
  // transform makes `position: fixed` anchor to that container instead of the
  // viewport — so an un-portaled drawer opens at the container top (needs a
  // scroll-up on long lists). Same reason Modal portals. Escape closes it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const sym = item.symbol.replace(/^BVB:/, "");
  const currency = quote?.currency ?? (item.assetClass === "ro_stock" ? "RON" : "USD");

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = { symbol: item.symbol, assetClass: item.assetClass, currency, targetPrice: fd.get("targetPrice"), direction: fd.get("direction"), note: fd.get("note") };
    const formEl = e.currentTarget;
    start(async () => {
      const res = await addPriceAlert(input);
      if (res.ok) formEl.reset();
      else setError(res.error);
    });
  }

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 h-full w-full max-w-xl animate-fade-up overflow-y-auto border-l border-border bg-panel p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{sym}</h3>
            {item.label && <p className="text-xs text-ink-faint">{item.label}</p>}
            {quote?.price != null && (
              <p className="tnum mt-1 text-2xl font-semibold">
                {fmtPrice(quote)} <span className="text-sm text-ink-faint">{currency}</span>
                {quote.changePct != null && (
                  <span className={`ml-2 text-sm ${quote.changePct >= 0 ? "text-gain" : "text-loss"}`}>
                    {quote.changePct >= 0 ? "+" : ""}{(quote.changePct * 100).toFixed(2)}%
                  </span>
                )}
              </p>
            )}
          </div>
          <button onClick={onClose} className="focusring rounded-lg p-1.5 text-ink-faint hover:bg-hover hover:text-ink"><X size={18} /></button>
        </div>

        <CandleChart symbol={item.symbol} assetClass={item.assetClass} />

        <div className="mt-6">
          <h4 className="mb-2 text-sm font-semibold text-ink-muted">Price alerts</h4>
          {alerts.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-raised px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    {a.triggeredAt ? <BellRing size={14} className="text-accent" /> : <Bell size={14} className="text-ink-faint" />}
                    {a.direction === "above" ? "≥" : "≤"} <span className="tnum">{a.targetPrice.toLocaleString("en-US")}</span> {a.currency}
                    {a.triggeredAt && <Badge tone="accent">triggered</Badge>}
                  </span>
                  {!readonly && (
                    <span className="flex gap-1">
                      {a.triggeredAt && (
                        <button onClick={() => start(async () => { await resetPriceAlert(a.id); })} className="focusring rounded px-2 py-0.5 text-xs text-ink-faint hover:bg-hover hover:text-ink">reset</button>
                      )}
                      <button onClick={() => start(async () => { await deletePriceAlert(a.id); })} disabled={pending} className="focusring rounded p-1 text-ink-faint hover:text-loss"><Trash2 size={13} /></button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!readonly && (
            <>
              <form onSubmit={onAdd} className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-raised p-3">
                <Field label="When price is">
                  <select name="direction" defaultValue="above" className={`${inputClass} w-28`}>
                    <option value="above">≥ above</option>
                    <option value="below">≤ below</option>
                  </select>
                </Field>
                <Field label={`Target (${currency})`}>
                  <input name="targetPrice" type="number" step="any" required className={`${inputClass} w-32`} />
                </Field>
                <input name="note" placeholder="note (optional)" className={`${inputClass} flex-1`} />
                <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-3 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">Add alert</button>
              </form>
              {error && <p className="mt-2 text-sm text-loss">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
