"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, SectionTitle, Badge } from "@/components/ui/primitives";
import { Money } from "@/components/ui/money";
import { Modal, Field, inputClass } from "@/components/ui/Modal";
import { upsertAccount, softDelete } from "@/app/actions";
import { useReadonly } from "@/components/ReadonlyContext";

export interface AccountItem {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  isCompany: boolean;
  balanceEur: number;
}

const TYPES = [
  ["crypto", "Crypto"],
  ["personal_cash", "Personal cash"],
  ["company_cash", "Company cash"],
  ["savings", "Savings"],
  ["brokerage", "Brokerage"],
] as const;
const CURRENCIES = ["EUR", "USD", "GBP", "RON"];

export function AccountsManager({ accounts }: { accounts: AccountItem[] }) {
  const readonly = useReadonly();
  const [editing, setEditing] = useState<AccountItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Cash &amp; accounts</SectionTitle>
        {!readonly && (
          <button onClick={() => setAdding(true)} className="focusring flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-hover">
            <Plus size={13} /> Add
          </button>
        )}
      </div>
      <ul className="divide-y divide-border/50">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2">
              {a.name}
              {a.isCompany && <Badge tone="amber">company</Badge>}
              <span className="text-xs text-ink-faint">{a.balance.toLocaleString("en-US")} {a.currency}</span>
            </span>
            <span className="flex items-center gap-2">
              <Money eur={a.balanceEur} compact className="text-ink-muted" />
              {!readonly && (
                <>
                  <button onClick={() => setEditing(a)} className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-ink"><Pencil size={13} /></button>
                  <button onClick={() => start(async () => { await softDelete("account", a.id); })} disabled={pending} className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-loss"><Trash2 size={13} /></button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      {(editing || adding) && (
        <AccountForm
          initial={editing ?? undefined}
          onClose={() => { setEditing(null); setAdding(false); }}
        />
      )}
    </Card>
  );
}

function AccountForm({ initial, onClose }: { initial?: AccountItem; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = { ...Object.fromEntries(fd.entries()), isCompany: fd.get("isCompany") === "on" };
    start(async () => {
      const res = await upsertAccount(initial?.id ?? null, input);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }
  return (
    <Modal open onClose={onClose} title={initial ? "Edit account" : "Add account"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name"><input name="name" required defaultValue={initial?.name ?? ""} className={inputClass} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select name="type" defaultValue={initial?.type ?? "personal_cash"} className={inputClass}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Currency">
            <select name="currency" defaultValue={initial?.currency ?? "EUR"} className={inputClass}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Balance"><input name="balance" type="number" step="any" required defaultValue={initial?.balance ?? ""} className={inputClass} /></Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isCompany" defaultChecked={initial?.isCompany} className="accent-accent" />
          Company cash (pre-tax-distribution; excluded from personal net worth)
        </label>
        {error && <p className="text-sm text-loss">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="focusring rounded-lg border border-border px-4 py-2 text-sm hover:bg-hover">Cancel</button>
          <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
