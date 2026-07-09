"use client";

import { useState, useTransition } from "react";
import { Modal, Field, inputClass } from "@/components/ui/Modal";
import { createTransaction, updateTransaction } from "@/app/actions";
import type { TransactionRow } from "@/db/queries";

const ASSET_CLASSES = [
  ["ro_stock", "RO Stock"],
  ["us_stock", "US Stock"],
  ["crypto", "Crypto"],
  ["reit", "Crowdfunding REIT"],
  ["mutual_fund", "Mutual Fund"],
  ["gold", "Gold"],
  ["other", "Other"],
] as const;

const CURRENCIES = ["USD", "EUR", "GBP", "RON"];

export function TransactionForm({
  open,
  onClose,
  initial,
  defaultAssetClass,
}: {
  open: boolean;
  onClose: () => void;
  initial?: TransactionRow;
  defaultAssetClass?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<string>(initial?.direction ?? "buy");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = Object.fromEntries(fd.entries());
    start(async () => {
      const res = initial
        ? await updateTransaction(initial.id, input)
        : await createTransaction(input);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit transaction" : "Add transaction"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Trade date">
            <input type="date" name="tradeDate" required defaultValue={initial?.tradeDate ?? ""} className={inputClass} />
          </Field>
          <Field label="Direction">
            <select name="direction" value={direction} onChange={(e) => setDirection(e.target.value)} className={inputClass}>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Asset class">
            <select name="assetClass" defaultValue={initial?.assetClass ?? defaultAssetClass ?? "ro_stock"} className={inputClass}>
              {ASSET_CLASSES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Symbol">
            <input name="symbol" required defaultValue={initial?.symbol ?? ""} placeholder="BVB:TLV" className={inputClass} />
          </Field>
        </div>
        <Field label="Quantity">
          <input name="quantity" type="number" step="any" required defaultValue={initial?.quantity ?? ""} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit cost">
            <input name="unitCost" type="number" step="any" required defaultValue={initial?.unitCost ?? ""} className={inputClass} />
          </Field>
          <Field label="Cost currency">
            <select name="costCurrency" defaultValue={initial?.costCurrency ?? "USD"} className={inputClass}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current price">
            <input name="currentPrice" type="number" step="any" required defaultValue={initial?.currentPrice ?? ""} className={inputClass} />
          </Field>
          <Field label="Price currency">
            <select name="priceCurrency" defaultValue={initial?.priceCurrency ?? "USD"} className={inputClass}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Commission (optional)">
            <input name="commission" type="number" step="any" min="0" defaultValue={initial?.commission ?? ""} placeholder="0" className={inputClass} />
          </Field>
          {direction === "sell" && (
            <Field label="Sale tax (optional)">
              <input name="saleTax" type="number" step="any" min="0" defaultValue={initial?.saleTax ?? ""} placeholder="0" className={inputClass} />
            </Field>
          )}
        </div>
        <Field label="Maturity date (REITs, optional)">
          <input name="maturityDate" type="date" defaultValue={initial?.maturityDate ?? ""} className={inputClass} />
        </Field>
        <Field label="Notes (optional)">
          <input name="notes" defaultValue={initial?.notes ?? ""} className={inputClass} />
        </Field>

        {error && <p className="text-sm text-loss">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="focusring rounded-lg border border-border px-4 py-2 text-sm hover:bg-hover">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
