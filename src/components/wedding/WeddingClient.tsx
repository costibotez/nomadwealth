"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, SectionTitle, StatCard } from "@/components/ui/primitives";
import { Modal, Field, inputClass } from "@/components/ui/Modal";
import { useCurrency } from "@/components/CurrencyProvider";
import type { Currency } from "@/config/fx";
import { upsertWeddingItem, deleteWeddingItem, upsertWeddingGift, deleteWeddingGift } from "@/app/actions";
import { useReadonly } from "@/components/ReadonlyContext";

export interface WeddingItem {
  id: number;
  label: string;
  paid: number;
  remaining: number;
  currency: string;
}

/**
 * Wedding amounts are stored in their own native currency (RON/EUR/…). Convert
 * each to EUR via the live rates, then the active display currency is applied
 * by the currency switcher — so these prices follow the switcher like the rest
 * of the app, and mixed-currency rows sum correctly.
 */
function nativeToEur(amount: number, cur: string, rates: Record<Currency, number>): number {
  const rate = rates[cur.toUpperCase() as Currency];
  return !rate || rate === 0 ? amount : amount / rate;
}

export function WeddingClient({ items }: { items: WeddingItem[] }) {
  const readonly = useReadonly();
  const [editing, setEditing] = useState<WeddingItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const { rates, money } = useCurrency();

  const eur = (n: number, cur: string) => nativeToEur(n, cur, rates);
  const totalPaid = items.reduce((s, i) => s + eur(i.paid, i.currency), 0);
  const totalRemaining = items.reduce((s, i) => s + eur(i.remaining, i.currency), 0);
  const total = totalPaid + totalRemaining;
  const progress = total ? totalPaid / total : 0;

  return (
    <div className="animate-fade-up space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Committed" value={<span className="tnum">{money(total)}</span>} />
        <StatCard label="Paid" value={<span className="tnum text-gain">{money(totalPaid)}</span>} />
        <StatCard label="Remaining" value={<span className="tnum text-loss">{money(totalRemaining)}</span>} />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>Budget — paid vs outstanding</SectionTitle>
          {!readonly && (
            <button onClick={() => setAdding(true)} className="focusring flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-black hover:brightness-110">
              <Plus size={15} /> Add expense
            </button>
          )}
        </div>
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-panel">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-ink-faint">
              <th className="py-2 font-medium">Expense</th>
              <th className="py-2 text-right font-medium">Paid</th>
              <th className="py-2 text-right font-medium">Remaining</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-border/50">
                <td className="py-2">{it.label}</td>
                <td className="tnum py-2 text-right text-gain">{it.paid ? money(eur(it.paid, it.currency)) : "—"}</td>
                <td className="tnum py-2 text-right text-loss">{it.remaining ? money(eur(it.remaining, it.currency)) : "—"}</td>
                <td className="py-2">
                  {!readonly && (
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(it)} className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-ink"><Pencil size={13} /></button>
                      <button
                        onClick={() => { if (confirm(`Delete "${it.label}"?`)) start(async () => { await deleteWeddingItem(it.id); }); }}
                        disabled={pending}
                        className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-loss"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {(editing || adding) && (
        <ItemForm initial={editing ?? undefined} onClose={() => { setEditing(null); setAdding(false); }} />
      )}
    </div>
  );
}

export interface Gift {
  id: number;
  name: string;
  type: string;
  amount: number;
  currency: string;
}

export function WeddingGifts({ gifts }: { gifts: Gift[] }) {
  const readonly = useReadonly();
  const [editing, setEditing] = useState<Gift | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const { rates, money } = useCurrency();

  const eur = (n: number, cur: string) => nativeToEur(n, cur, rates);
  const total = gifts.reduce((s, g) => s + eur(g.amount, g.currency), 0);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Gift obligations</SectionTitle>
        {!readonly && (
          <button onClick={() => setAdding(true)} className="focusring flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-hover">
            <Plus size={15} /> Add gift
          </button>
        )}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {gifts.map((g) => (
            <tr key={g.id} className="border-b border-border/50">
              <td className="py-2">{g.name}</td>
              <td className="py-2"><span className="rounded-md bg-hover px-2 py-0.5 text-xs text-ink-muted">{g.type}</span></td>
              <td className="tnum py-2 text-right">{money(eur(g.amount, g.currency))}</td>
              <td className="py-2">
                {!readonly && (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing(g)} className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-ink"><Pencil size={13} /></button>
                    <button onClick={() => { if (confirm(`Delete "${g.name}"?`)) start(async () => { await deleteWeddingGift(g.id); }); }} disabled={pending} className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-loss"><Trash2 size={13} /></button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          <tr className="font-medium">
            <td className="py-2" colSpan={2}>Total</td>
            <td className="tnum py-2 text-right">{money(total)}</td>
            <td />
          </tr>
        </tbody>
      </table>
      {(editing || adding) && (
        <GiftForm initial={editing ?? undefined} onClose={() => { setEditing(null); setAdding(false); }} />
      )}
    </Card>
  );
}

function GiftForm({ initial, onClose }: { initial?: Gift; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = Object.fromEntries(new FormData(e.currentTarget).entries());
    start(async () => {
      const res = await upsertWeddingGift(initial?.id ?? null, input);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }
  return (
    <Modal open onClose={onClose} title={initial ? "Edit gift" : "Add gift"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name"><input name="name" required defaultValue={initial?.name ?? ""} className={inputClass} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select name="type" defaultValue={initial?.type ?? "Nuntă"} className={inputClass}>
              {["Nuntă", "Botez", "Aniversare", "Altele"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Amount"><input name="amount" type="number" step="any" required defaultValue={initial?.amount ?? ""} className={inputClass} /></Field>
        </div>
        <Field label="Currency">
          <select name="currency" defaultValue={initial?.currency ?? "RON"} className={inputClass}>
            {["RON", "EUR", "USD", "GBP"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        {error && <p className="text-sm text-loss">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="focusring rounded-lg border border-border px-4 py-2 text-sm hover:bg-hover">Cancel</button>
          <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

function ItemForm({ initial, onClose }: { initial?: WeddingItem; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = Object.fromEntries(new FormData(e.currentTarget).entries());
    start(async () => {
      const res = await upsertWeddingItem(initial?.id ?? null, input);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }
  return (
    <Modal open onClose={onClose} title={initial ? "Edit expense" : "Add expense"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Expense"><input name="label" required defaultValue={initial?.label ?? ""} className={inputClass} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paid"><input name="paid" type="number" step="any" defaultValue={initial?.paid ?? 0} className={inputClass} /></Field>
          <Field label="Remaining"><input name="remaining" type="number" step="any" defaultValue={initial?.remaining ?? 0} className={inputClass} /></Field>
        </div>
        <Field label="Currency">
          <select name="currency" defaultValue={initial?.currency ?? "RON"} className={inputClass}>
            {["RON", "EUR", "USD", "GBP"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        {error && <p className="text-sm text-loss">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="focusring rounded-lg border border-border px-4 py-2 text-sm hover:bg-hover">Cancel</button>
          <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
