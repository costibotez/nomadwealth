"use client";

import { useState, useTransition } from "react";
import { Trash2, Coins, Pencil } from "lucide-react";
import { Card, SectionTitle, PageGrid, EmptyState, Badge } from "@/components/ui/primitives";
import { Money } from "@/components/ui/money";
import { useCurrency } from "@/components/CurrencyProvider";
import { addDividend, updateDividend, deleteDividend } from "@/app/actions";
import { useReadonly } from "@/components/ReadonlyContext";
import { formatPct } from "@/lib/format";
import { Modal, Field, inputClass } from "@/components/ui/Modal";

interface Holding {
  symbol: string;
  assetClass: string;
  shares: number;
  annualEur: number;
  yieldOnCost: number | null;
  lastPay: string | null;
  nextPay: string | null;
  currency: string;
}
interface LedgerRow {
  id: number;
  symbol: string;
  assetClass: string;
  exDate: string | null;
  payDate: string;
  /** After-tax net cash received for this payout, in `currency`. */
  netNative: number;
  currency: string;
  shares: number;
  cashEur: number;
  note: string | null;
}
export interface DividendModel {
  ttmIncomeEur: number;
  projectedAnnualEur: number;
  portfolioYoc: number | null;
  holdings: Holding[];
  calendar: { label: string; eur: number }[];
  ledger: LedgerRow[];
}

const ASSET_CLASSES = [
  ["ro_stock", "RO Stock"],
  ["us_stock", "US Stock"],
  ["reit", "REIT"],
  ["mutual_fund", "Mutual Fund"],
  ["crypto", "Crypto"],
  ["other", "Other"],
] as const;

export function DividendsClient({ model }: { model: DividendModel }) {
  const readonly = useReadonly();
  return (
    <PageGrid>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Income (trailing 12m)" value={<Money eur={model.ttmIncomeEur} />} />
        <Kpi label="Projected annual income" value={<Money eur={model.projectedAnnualEur} />} />
        <Kpi label="Portfolio yield-on-cost" value={model.portfolioYoc != null ? formatPct(model.portfolioYoc, { signed: false }) : "—"} />
      </div>

      <Card>
        <SectionTitle>Payout calendar (last 12 months)</SectionTitle>
        <PayoutCalendar data={model.calendar} />
      </Card>

      <Card>
        <SectionTitle>By holding</SectionTitle>
        {model.holdings.length === 0 ? (
          <EmptyState message="No dividends recorded yet — add one below." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint">
                  <th className="py-2 font-normal">Symbol</th>
                  <th className="py-2 text-right font-normal">Shares</th>
                  <th className="py-2 text-right font-normal">Annual income</th>
                  <th className="py-2 text-right font-normal">Yield on cost</th>
                  <th className="py-2 text-right font-normal">Last paid</th>
                  <th className="py-2 text-right font-normal">Next</th>
                </tr>
              </thead>
              <tbody>
                {model.holdings.map((h) => (
                  <tr key={`${h.assetClass}:${h.symbol}`} className="border-t border-border/40">
                    <td className="py-2 font-medium">{h.symbol}</td>
                    <td className="py-2 text-right tnum">{h.shares.toLocaleString("en-US")}</td>
                    <td className="py-2 text-right tnum"><Money eur={h.annualEur} /></td>
                    <td className="py-2 text-right tnum">{h.yieldOnCost != null ? formatPct(h.yieldOnCost, { signed: false }) : "—"}</td>
                    <td className="py-2 text-right text-ink-muted">{h.lastPay ?? "—"}</td>
                    <td className="py-2 text-right text-ink-muted">{h.nextPay ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!readonly && <AddDividend />}

      <Card>
        <SectionTitle>Dividend ledger</SectionTitle>
        <Ledger rows={model.ledger} />
      </Card>
    </PageGrid>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="stat-label">{label}</div>
      <div className="mt-1.5 text-lg font-semibold">{value}</div>
    </div>
  );
}

function PayoutCalendar({ data }: { data: { label: string; eur: number }[] }) {
  const { money } = useCurrency();
  const max = Math.max(1, ...data.map((d) => d.eur));
  return (
    <div className="flex h-44 items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-1">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-accent/70 transition-colors group-hover:bg-accent"
              style={{ height: `${(d.eur / max) * 100}%`, minHeight: d.eur > 0 ? 2 : 0 }}
              title={money(d.eur)}
            />
          </div>
          <span className="text-[10px] text-ink-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function AddDividend() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      symbol: fd.get("symbol"),
      assetClass: fd.get("assetClass"),
      exDate: fd.get("exDate"),
      payDate: fd.get("payDate"),
      netAmount: fd.get("netAmount"),
      currency: fd.get("currency"),
      note: fd.get("note"),
    };
    const formEl = e.currentTarget;
    start(async () => {
      const res = await addDividend(input);
      if (res.ok) formEl.reset();
      else setError(res.error);
    });
  }

  return (
    <Card>
      <SectionTitle>Add dividend</SectionTitle>
      <form onSubmit={onSubmit} className="mt-2 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Symbol">
            <input name="symbol" placeholder="e.g. TLV" required className={inputClass} />
          </Field>
          <Field label="Asset class">
            <select name="assetClass" defaultValue="ro_stock" className={inputClass}>
              {ASSET_CLASSES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Net (after tax)">
            <input name="netAmount" type="number" step="any" required className={inputClass} />
          </Field>
          <Field label="Currency">
            <input name="currency" defaultValue="RON" required className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Ex-date (optional)">
            <input name="exDate" type="date" className={inputClass} />
          </Field>
          <Field label="Pay date">
            <input name="payDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
          </Field>
          <Field label="Note (optional)">
            <input name="note" placeholder="optional" className={inputClass} />
          </Field>
        </div>
        {error && <p className="text-xs text-loss">{error}</p>}
        <button type="submit" disabled={pending} className="focusring flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">
          <Coins size={15} /> {pending ? "Saving…" : "Add dividend"}
        </button>
        <p className="text-xs text-ink-faint">
          Enter the net cash you actually received after tax. It&apos;s converted to your display currency automatically.
        </p>
      </form>
    </Card>
  );
}

function Ledger({ rows }: { rows: LedgerRow[] }) {
  const readonly = useReadonly();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<LedgerRow | null>(null);
  if (rows.length === 0) return <EmptyState message="No dividends recorded yet." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-faint">
            <th className="py-2 font-normal">Pay date</th>
            <th className="py-2 font-normal">Symbol</th>
            <th className="py-2 text-right font-normal">Net (after tax)</th>
            <th className="py-2 text-right font-normal">Shares</th>
            <th className="py-2 text-right font-normal">Cash</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/40">
              <td className="py-2 text-ink-muted">{r.payDate}</td>
              <td className="py-2"><span className="font-medium">{r.symbol}</span> <Badge>{r.assetClass}</Badge></td>
              <td className="py-2 text-right tnum">{r.netNative.toLocaleString("en-US")} {r.currency}</td>
              <td className="py-2 text-right tnum">{r.shares.toLocaleString("en-US")}</td>
              <td className="py-2 text-right tnum"><Money eur={r.cashEur} /></td>
              <td className="py-2 text-right">
                {!readonly && (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing(r)} className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-ink"><Pencil size={13} /></button>
                    <button onClick={() => start(async () => { await deleteDividend(r.id); })} disabled={pending} className="focusring rounded p-1 text-ink-faint hover:text-loss"><Trash2 size={13} /></button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && <EditDividend row={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditDividend({ row, onClose }: { row: LedgerRow; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      symbol: fd.get("symbol"),
      assetClass: fd.get("assetClass"),
      exDate: fd.get("exDate"),
      payDate: fd.get("payDate"),
      netAmount: fd.get("netAmount"),
      currency: fd.get("currency"),
      note: fd.get("note"),
    };
    start(async () => {
      const res = await updateDividend(row.id, input);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <Modal open onClose={onClose} title="Edit dividend">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Symbol">
            <input name="symbol" required defaultValue={row.symbol} className={inputClass} />
          </Field>
          <Field label="Asset class">
            <select name="assetClass" defaultValue={row.assetClass} className={inputClass}>
              {ASSET_CLASSES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Net (after tax)">
            <input name="netAmount" type="number" step="any" required defaultValue={row.netNative} className={inputClass} />
          </Field>
          <Field label="Currency">
            <input name="currency" required defaultValue={row.currency} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Ex-date (optional)">
            <input name="exDate" type="date" defaultValue={row.exDate ?? ""} className={inputClass} />
          </Field>
          <Field label="Pay date">
            <input name="payDate" type="date" required defaultValue={row.payDate} className={inputClass} />
          </Field>
          <Field label="Note (optional)">
            <input name="note" defaultValue={row.note ?? ""} className={inputClass} />
          </Field>
        </div>
        {error && <p className="text-xs text-loss">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="focusring rounded-lg border border-border px-4 py-2 text-sm hover:bg-hover">Cancel</button>
          <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
