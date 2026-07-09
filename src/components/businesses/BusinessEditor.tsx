"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal, Field, inputClass } from "@/components/ui/Modal";
import { upsertBusiness, deleteBusiness, addBusinessLedger, deleteBusinessLedger } from "@/app/actions";
import { useReadonly } from "@/components/ReadonlyContext";

export interface BusinessInitial {
  id: number;
  name: string;
  currency: string;
  status: string;
  valuation: number | null;
  startedOn: string | null;
  notes: string | null;
}

const CURRENCIES = ["EUR", "RON", "USD", "GBP"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const KINDS: [string, string][] = [
  ["revenue", "Revenue"],
  ["cogs", "COGS / direct cost"],
  ["ad_spend", "Ad spend"],
  ["expense", "Other expense"],
];

function Form({ initial, onClose }: { initial?: BusinessInitial; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = Object.fromEntries(new FormData(e.currentTarget).entries());
    start(async () => {
      const res = await upsertBusiness(initial?.id ?? null, input);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <Modal open onClose={onClose} title={initial ? "Edit business" : "Add business"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name"><input name="name" required defaultValue={initial?.name ?? ""} className={inputClass} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select name="status" defaultValue={initial?.status ?? "active"} className={inputClass}>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
          <Field label="Currency">
            <select name="currency" defaultValue={initial?.currency ?? "EUR"} className={inputClass}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valuation (optional)"><input name="valuation" type="number" step="any" defaultValue={initial?.valuation ?? ""} placeholder="counts toward net worth" className={inputClass} /></Field>
          <Field label="Started on"><input name="startedOn" type="date" defaultValue={initial?.startedOn ?? ""} className={inputClass} /></Field>
        </div>
        <Field label="Notes"><input name="notes" defaultValue={initial?.notes ?? ""} className={inputClass} /></Field>
        {error && <p className="text-sm text-loss">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="focusring rounded-lg border border-border px-4 py-2 text-sm hover:bg-hover">Cancel</button>
          <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

export function BusinessEditButton({ business }: { business: BusinessInitial }) {
  const readonly = useReadonly();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  if (readonly) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="focusring rounded p-1.5 text-ink-faint hover:bg-hover hover:text-ink" aria-label="Edit business">
        <Pencil size={14} />
      </button>
      <button
        onClick={() => { if (confirm(`Delete "${business.name}"? Moves to Trash.`)) start(async () => { await deleteBusiness(business.id); }); }}
        disabled={pending}
        className="focusring rounded p-1.5 text-ink-faint hover:bg-hover hover:text-loss"
        aria-label="Delete business"
      >
        <Trash2 size={14} />
      </button>
      {open && <Form initial={business} onClose={() => setOpen(false)} />}
    </>
  );
}

export function AddBusinessButton() {
  const readonly = useReadonly();
  const [open, setOpen] = useState(false);
  if (readonly) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="focusring flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-hover">
        <Plus size={15} /> Add business
      </button>
      {open && <Form onClose={() => setOpen(false)} />}
    </>
  );
}

export interface LedgerEntry {
  id: number;
  year: number;
  month: number | null;
  kind: string;
  label: string | null;
  amount: number;
  currency: string;
}

export function BusinessLedgerEditor({
  businessId,
  defaultCurrency,
  entries,
}: {
  businessId: number;
  defaultCurrency: string;
  entries: LedgerEntry[];
}) {
  const readonly = useReadonly();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (readonly) return null;

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const monthRaw = fd.get("month") as string;
    const input = {
      businessId,
      year: fd.get("year"),
      month: monthRaw === "" ? null : monthRaw,
      kind: fd.get("kind"),
      amount: fd.get("amount"),
      currency: fd.get("currency"),
      label: fd.get("label"),
    };
    const formEl = e.currentTarget;
    start(async () => {
      const res = await addBusinessLedger(input);
      if (res.ok) formEl.reset();
      else setError(res.error);
    });
  }

  const kindLabel = (k: string) => KINDS.find(([v]) => v === k)?.[1] ?? k;

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <button onClick={() => setOpen((o) => !o)} className="focusring text-xs text-ink-muted hover:text-ink">
        {open ? "Hide" : "Edit"} P&amp;L ledger ({entries.length})
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {entries.length > 0 && (
            <div className="max-h-44 overflow-y-auto">
              {entries.map((l) => (
                <div key={l.id} className="flex items-center justify-between border-b border-border/40 py-1 text-xs">
                  <span className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${l.kind === "revenue" ? "bg-gain/10 text-gain" : "bg-hover text-ink-muted"}`}>
                      {kindLabel(l.kind)}
                    </span>
                    <span className="text-ink-muted">{l.year}{l.month ? ` · ${MONTHS[l.month - 1]}` : " · full year"}{l.label ? ` · ${l.label}` : ""}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tnum">{l.amount.toLocaleString("en-US")} {l.currency}</span>
                    <button onClick={() => start(async () => { await deleteBusinessLedger(l.id); })} disabled={pending} className="focusring rounded p-0.5 text-ink-faint hover:text-loss"><Trash2 size={12} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={onAdd} className="flex flex-wrap items-end gap-2">
            <select name="kind" defaultValue="revenue" className={`${inputClass} w-32`}>
              {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input name="year" type="number" placeholder="Year" required defaultValue={new Date().getFullYear()} className={`${inputClass} w-20`} />
            <select name="month" defaultValue="" className={`${inputClass} w-24`}>
              <option value="">Full year</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input name="label" placeholder="label (optional)" className={`${inputClass} w-32`} />
            <input name="amount" type="number" step="any" placeholder="Amount" required className={`${inputClass} w-24`} />
            <select name="currency" defaultValue={defaultCurrency} className={`${inputClass} w-20`}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-3 py-2 text-xs font-medium text-black hover:brightness-110 disabled:opacity-50">Add</button>
          </form>
          {error && <p className="text-xs text-loss">{error}</p>}
        </div>
      )}
    </div>
  );
}
