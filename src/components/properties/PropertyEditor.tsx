"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal, Field, inputClass } from "@/components/ui/Modal";
import { upsertProperty, addRent, deleteRent, addPropertyLedger, deletePropertyLedger } from "@/app/actions";
import { useReadonly } from "@/components/ReadonlyContext";

export interface PropertyInitial {
  id: number;
  name: string;
  value: number;
  currency: string;
  monthlyRent: number;
  isRented: boolean;
  status: string;
  purchaseDate: string | null;
  purchasePrice: number | null;
  saleDate: string | null;
  salePrice: number | null;
  notes: string | null;
}

const CURRENCIES = ["EUR", "RON", "USD", "GBP"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function Form({ initial, onClose }: { initial?: PropertyInitial; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sold, setSold] = useState(initial?.status === "sold");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = { ...Object.fromEntries(fd.entries()), isRented: fd.get("isRented") === "on" };
    start(async () => {
      const res = await upsertProperty(initial?.id ?? null, input);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <Modal open onClose={onClose} title={initial ? "Edit property" : "Add property"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name"><input name="name" required defaultValue={initial?.name ?? ""} className={inputClass} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current value"><input name="value" type="number" step="any" required defaultValue={initial?.value ?? ""} className={inputClass} /></Field>
          <Field label="Currency">
            <select name="currency" defaultValue={initial?.currency ?? "EUR"} className={inputClass}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Purchase date"><input name="purchaseDate" type="date" defaultValue={initial?.purchaseDate ?? ""} className={inputClass} /></Field>
          <Field label="Purchase price"><input name="purchasePrice" type="number" step="any" defaultValue={initial?.purchasePrice ?? ""} placeholder="for ROI" className={inputClass} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select name="status" defaultValue={initial?.status ?? "active"} onChange={(e) => setSold(e.target.value === "sold")} className={inputClass}>
              <option value="active">Active (owned)</option>
              <option value="sold">Sold</option>
            </select>
          </Field>
          <Field label="Monthly rent (current)"><input name="monthlyRent" type="number" step="any" defaultValue={initial?.monthlyRent ?? 0} className={inputClass} /></Field>
        </div>
        {sold && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-panel p-3">
            <Field label="Sale date"><input name="saleDate" type="date" defaultValue={initial?.saleDate ?? ""} className={inputClass} /></Field>
            <Field label="Sale price"><input name="salePrice" type="number" step="any" defaultValue={initial?.salePrice ?? ""} className={inputClass} /></Field>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isRented" defaultChecked={initial?.isRented} className="accent-accent" /> Currently rented
        </label>
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

export function PropertyEditButton({ property }: { property: PropertyInitial }) {
  const readonly = useReadonly();
  const [open, setOpen] = useState(false);
  if (readonly) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="focusring rounded p-1.5 text-ink-faint hover:bg-hover hover:text-ink" aria-label="Edit property">
        <Pencil size={14} />
      </button>
      {open && <Form initial={property} onClose={() => setOpen(false)} />}
    </>
  );
}

export function AddPropertyButton() {
  const readonly = useReadonly();
  const [open, setOpen] = useState(false);
  if (readonly) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="focusring flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-hover">
        <Plus size={15} /> Add property
      </button>
      {open && <Form onClose={() => setOpen(false)} />}
    </>
  );
}

// ---- Cost / sale ledger editor -------------------------------------------
export interface LedgerEntry {
  id: number;
  kind: string;
  label: string;
  amount: number;
  currency: string;
}

export function LedgerEditor({
  propertyId,
  defaultCurrency,
  entries,
}: {
  propertyId: number;
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
    const input = {
      propertyId,
      kind: fd.get("kind"),
      label: fd.get("label"),
      amount: fd.get("amount"),
      currency: fd.get("currency"),
    };
    const formEl = e.currentTarget;
    start(async () => {
      const res = await addPropertyLedger(input);
      if (res.ok) formEl.reset();
      else setError(res.error);
    });
  }

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <button onClick={() => setOpen((o) => !o)} className="focusring text-xs text-ink-muted hover:text-ink">
        {open ? "Hide" : "Edit"} cost &amp; sale breakdown ({entries.length})
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {entries.length > 0 && (
            <div className="max-h-44 overflow-y-auto">
              {entries.map((l) => (
                <div key={l.id} className="flex items-center justify-between border-b border-border/40 py-1 text-xs">
                  <span className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${l.kind === "sale" ? "bg-gain/10 text-gain" : "bg-hover text-ink-muted"}`}>
                      {l.kind === "sale" ? "sale" : "cost"}
                    </span>
                    <span className="text-ink-muted">{l.label}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tnum">{l.amount.toLocaleString("en-US")} {l.currency}</span>
                    <button onClick={() => start(async () => { await deletePropertyLedger(l.id); })} disabled={pending} className="focusring rounded p-0.5 text-ink-faint hover:text-loss"><Trash2 size={12} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={onAdd} className="flex flex-wrap items-end gap-2">
            <select name="kind" defaultValue="acquisition" className={`${inputClass} w-24`}>
              <option value="acquisition">Cost</option>
              <option value="sale">Sale</option>
            </select>
            <input name="label" placeholder="e.g. Parcare" required className={`${inputClass} w-32`} />
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

// ---- Rent ledger editor --------------------------------------------------
export interface RentEntry {
  id: number;
  year: number;
  month: number | null;
  amount: number;
  currency: string;
}

export function RentEditor({
  propertyId,
  defaultCurrency,
  entries,
}: {
  propertyId: number;
  defaultCurrency: string;
  entries: RentEntry[];
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
      propertyId,
      year: fd.get("year"),
      month: monthRaw === "" ? null : monthRaw,
      amount: fd.get("amount"),
      currency: fd.get("currency"),
    };
    const formEl = e.currentTarget;
    start(async () => {
      const res = await addRent(input);
      if (res.ok) formEl.reset();
      else setError(res.error);
    });
  }

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <button onClick={() => setOpen((o) => !o)} className="focusring text-xs text-ink-muted hover:text-ink">
        {open ? "Hide" : "Edit"} rent ledger ({entries.length})
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {entries.length > 0 && (
            <div className="max-h-40 overflow-y-auto">
              {entries.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b border-border/40 py-1 text-xs">
                  <span className="text-ink-muted">
                    {r.year}{r.month ? ` · ${MONTHS[r.month - 1]}` : " · full year"}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tnum">{r.amount.toLocaleString("en-US")} {r.currency}</span>
                    <button
                      onClick={() => start(async () => { await deleteRent(r.id); })}
                      disabled={pending}
                      className="focusring rounded p-0.5 text-ink-faint hover:text-loss"
                      aria-label="Delete rent entry"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={onAdd} className="flex flex-wrap items-end gap-2">
            <input name="year" type="number" placeholder="Year" required defaultValue={new Date().getFullYear()} className={`${inputClass} w-20`} />
            <select name="month" defaultValue="" className={`${inputClass} w-24`}>
              <option value="">Full year</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input name="amount" type="number" step="any" placeholder="Amount" required className={`${inputClass} w-24`} />
            <select name="currency" defaultValue={defaultCurrency} className={`${inputClass} w-20`}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-3 py-2 text-xs font-medium text-black hover:brightness-110 disabled:opacity-50">
              Add
            </button>
          </form>
          {error && <p className="text-xs text-loss">{error}</p>}
        </div>
      )}
    </div>
  );
}
