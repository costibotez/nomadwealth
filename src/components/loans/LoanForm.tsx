"use client";

import { useState, useTransition } from "react";
import { Modal, Field, inputClass } from "@/components/ui/Modal";
import { createLoan, updateLoan } from "@/app/actions";

export interface LoanInitial {
  id: number;
  borrower: string;
  principal: number;
  currency: string;
  backed: string;
  startDate: string | null;
  interestRate: number;
  compounding: string;
  termMonths: number | null;
  status: string;
  notes: string | null;
}

const CURRENCIES = ["EUR", "USD", "GBP", "RON"];

export function LoanForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: LoanInitial;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const input = Object.fromEntries(new FormData(e.currentTarget).entries());
    start(async () => {
      const res = initial ? await updateLoan(initial.id, input) : await createLoan(input);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit loan" : "Add loan"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Borrower">
          <input name="borrower" required defaultValue={initial?.borrower ?? ""} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Principal">
            <input name="principal" type="number" step="any" required defaultValue={initial?.principal ?? ""} className={inputClass} />
          </Field>
          <Field label="Currency">
            <select name="currency" defaultValue={initial?.currency ?? "EUR"} className={inputClass}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Interest rate (% annual)">
            <input name="interestRate" type="number" step="any" defaultValue={initial?.interestRate ?? 0} className={inputClass} />
          </Field>
          <Field label="Compounding">
            <select name="compounding" defaultValue={initial?.compounding ?? "simple"} className={inputClass}>
              <option value="simple">Simple</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Backed by">
            <select name="backed" defaultValue={initial?.backed ?? "none"} className={inputClass}>
              <option value="none">None</option>
              <option value="property">Property</option>
              <option value="business">Business</option>
              <option value="personal">Personal</option>
            </select>
          </Field>
          <Field label="Term (months)">
            <input name="termMonths" type="number" defaultValue={initial?.termMonths ?? ""} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input name="startDate" type="date" defaultValue={initial?.startDate ?? ""} className={inputClass} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={initial?.status ?? "active"} className={inputClass}>
              <option value="active">Active</option>
              <option value="repaid">Repaid</option>
              <option value="defaulted">Defaulted</option>
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <input name="notes" defaultValue={initial?.notes ?? ""} className={inputClass} />
        </Field>

        {error && <p className="text-sm text-loss">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="focusring rounded-lg border border-border px-4 py-2 text-sm hover:bg-hover">Cancel</button>
          <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
