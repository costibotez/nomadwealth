"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, CalendarClock, Check } from "lucide-react";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { Money } from "@/components/ui/money";
import { LoanForm, type LoanInitial } from "./LoanForm";
import { softDelete, addLoanReceipt, deleteLoanReceipt, addLoanPayment, deleteLoanPayment, toggleLoanPayment } from "@/app/actions";
import { formatPct } from "@/lib/format";
import { Field, inputClass } from "@/components/ui/Modal";
import { useReadonly } from "@/components/ReadonlyContext";

export interface Receipt {
  id: number;
  kind: string;
  amount: number;
  currency: string;
  receivedOn: string;
  method: string;
  bank: string | null;
}
export interface Payment {
  id: number;
  dueDate: string;
  amount: number;
  currency: string;
  paid: boolean;
  paidDate: string | null;
}
export interface DueSoon {
  id: number;
  borrower: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysUntil: number;
  overdue: boolean;
}
export interface LoanCard extends LoanInitial {
  principalEur: number;
  receipts: Receipt[];
  payments: Payment[];
  expectedInterest: number;
  interestEarned: number;
  interestReceived: number;
  principalRepaid: number;
  principalRemaining: number;
  nextDue: { date: string; amount: number } | null;
  irr: number | null;
}

export function LoansClient({ loans, totalNetWorthEur, dueSoon }: { loans: LoanCard[]; totalNetWorthEur: number; dueSoon: DueSoon[] }) {
  const readonly = useReadonly();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LoanInitial | undefined>();

  const counterparties = new Set(loans.filter((l) => l.status === "active").map((l) => l.borrower)).size;
  const lentEur = loans.filter((l) => l.status === "active").reduce((s, l) => s + l.principalEur, 0);
  const concPct = totalNetWorthEur ? lentEur / totalNetWorthEur : 0;

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          <Money eur={lentEur} compact /> lent across {counterparties} counterparties ·{" "}
          <span className="text-ink">{formatPct(concPct, { signed: false })}</span> of net worth
        </p>
        {!readonly && (
          <button
            onClick={() => { setEditing(undefined); setFormOpen(true); }}
            className="focusring flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-black hover:brightness-110"
          >
            <Plus size={15} /> Add loan
          </button>
        )}
      </div>

      {dueSoon.length > 0 && <DueSoonStrip items={dueSoon} />}

      {loans.length === 0 ? (
        <EmptyState message="No loans yet." />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {loans.map((l) => (
            <LoanCardView key={l.id} loan={l} onEdit={() => { setEditing(l); setFormOpen(true); }} />
          ))}
        </div>
      )}

      <LoanForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} />
    </div>
  );
}

function LoanCardView({ loan, onEdit }: { loan: LoanCard; onEdit: () => void }) {
  const readonly = useReadonly();
  const [showSchedule, setShowSchedule] = useState(false);
  const [pending, start] = useTransition();

  const interestFree = loan.interestRate === 0;
  const progress = loan.principal ? loan.principalRepaid / loan.principal : 0;

  function onDelete() {
    if (!confirm(`Delete loan to ${loan.borrower}? Moves to Trash.`)) return;
    start(async () => { await softDelete("loan", loan.id); });
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{loan.borrower}</h3>
            <Badge tone={loan.status === "active" ? "gain" : "neutral"}>{loan.status}</Badge>
            {interestFree && <Badge tone="amber">0% — principal only</Badge>}
            <Badge>{loan.backed}</Badge>
          </div>
          <div className="mt-1 text-2xl font-semibold"><Money eur={loan.principalEur} /></div>
        </div>
        {!readonly && (
          <div className="flex gap-1">
            <button onClick={onEdit} className="focusring rounded p-1.5 text-ink-faint hover:bg-hover hover:text-ink"><Pencil size={14} /></button>
            <button onClick={onDelete} disabled={pending} className="focusring rounded p-1.5 text-ink-faint hover:bg-hover hover:text-loss"><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Row label="Rate" value={`${loan.interestRate}% ${loan.compounding}`} />
        <Row label="Expected interest" value={loan.expectedInterest.toLocaleString("en-US", { maximumFractionDigits: 0 })} />
        <Row label="Interest accrued" value={loan.interestEarned.toLocaleString("en-US", { maximumFractionDigits: 0 })} />
        <Row label="Interest received" value={loan.interestReceived.toLocaleString("en-US", { maximumFractionDigits: 0 })} />
        <Row label="Effective yield (IRR)" value={loan.irr != null ? formatPct(loan.irr, { signed: false }) : "—"} />
        <Row label="Repaid" value={loan.principalRepaid.toLocaleString("en-US", { maximumFractionDigits: 0 })} />
        <Row label="Remaining" value={loan.principalRemaining.toLocaleString("en-US", { maximumFractionDigits: 0 })} />
      </dl>

      {loan.principal > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-ink-faint">
            <span>Principal repaid</span>
            <span className="tnum">
              {loan.principalRepaid.toLocaleString("en-US", { maximumFractionDigits: 0 })} / {loan.principal.toLocaleString("en-US", { maximumFractionDigits: 0 })} {loan.currency} · {(progress * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
        </div>
      )}

      <PaymentsSchedule loan={loan} />
      <ReceiptsLedger loan={loan} />
    </Card>
  );
}

function DueSoonStrip({ items }: { items: DueSoon[] }) {
  const readonly = useReadonly();
  const [pending, start] = useTransition();
  return (
    <Card>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <CalendarClock size={15} className="text-accent" />
        Payments due soon
      </div>
      <div className="space-y-1.5">
        {items.map((it) => {
          const when =
            it.daysUntil < 0
              ? `${Math.abs(it.daysUntil)}d overdue`
              : it.daysUntil === 0
                ? "due today"
                : `in ${it.daysUntil}d`;
          return (
            <div key={it.id} className="flex items-center justify-between rounded-lg border border-border bg-panel px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Badge tone={it.overdue ? "loss" : "amber"}>{when}</Badge>
                <span className="font-medium">{it.borrower}</span>
                <span className="text-ink-faint">{it.dueDate}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="tnum">{it.amount.toLocaleString("en-US")} {it.currency}</span>
                {!readonly && (
                  <button
                    onClick={() => start(async () => { await toggleLoanPayment(it.id, true); })}
                    disabled={pending}
                    title="Mark paid"
                    className="focusring flex items-center gap-1 rounded-md bg-gain/10 px-2 py-1 text-xs text-gain hover:brightness-110 disabled:opacity-50"
                  >
                    <Check size={12} /> Mark paid
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PaymentsSchedule({ loan }: { loan: LoanCard }) {
  const readonly = useReadonly();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const unpaid = loan.payments.filter((p) => !p.paid).length;

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = { loanId: loan.id, dueDate: fd.get("dueDate"), amount: fd.get("amount"), currency: loan.currency };
    const formEl = e.currentTarget;
    start(async () => {
      const res = await addLoanPayment(input);
      if (res.ok) formEl.reset();
      else setError(res.error);
    });
  }

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <button onClick={() => setOpen((o) => !o)} className="focusring text-xs text-ink-muted hover:text-ink">
        {open ? "Hide" : "Show"} scheduled payments ({loan.payments.length}{unpaid > 0 ? `, ${unpaid} due` : ""})
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {loan.payments.length > 0 && (
            <div className="max-h-44 overflow-y-auto">
              {loan.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-border/40 py-1 text-xs">
                  <span className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${p.paid ? "bg-gain/10 text-gain" : "bg-accent-soft text-accent"}`}>
                      {p.paid ? "paid" : "due"}
                    </span>
                    <span className="text-ink-muted">{p.dueDate}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tnum">{p.amount.toLocaleString("en-US")} {p.currency}</span>
                    {!readonly && (
                      <>
                        <button onClick={() => start(async () => { await toggleLoanPayment(p.id, !p.paid); })} disabled={pending} title={p.paid ? "Mark unpaid" : "Mark paid"} className="focusring rounded p-0.5 text-ink-faint hover:text-gain"><Check size={12} /></button>
                        <button onClick={() => start(async () => { await deleteLoanPayment(p.id); })} disabled={pending} className="focusring rounded p-0.5 text-ink-faint hover:text-loss"><Trash2 size={12} /></button>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!readonly && (
            <form onSubmit={onAdd} className="space-y-2 rounded-lg border border-border bg-panel p-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Due date">
                  <input name="dueDate" type="date" required className={inputClass} />
                </Field>
                <Field label={`Amount (${loan.currency})`}>
                  <input name="amount" type="number" step="any" required className={inputClass} />
                </Field>
              </div>
              {error && <p className="text-xs text-loss">{error}</p>}
              <button type="submit" disabled={pending} className="focusring w-full rounded-lg bg-accent px-3 py-2 text-xs font-medium text-black hover:brightness-110 disabled:opacity-50">
                {pending ? "Saving…" : "Add expected payment"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="tnum">{value}</dd>
    </div>
  );
}

function ReceiptsLedger({ loan }: { loan: LoanCard }) {
  const readonly = useReadonly();
  const [open, setOpen] = useState(loan.receipts.length > 0);
  const [method, setMethod] = useState("bank_transfer");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      loanId: loan.id,
      kind: fd.get("kind"),
      amount: fd.get("amount"),
      currency: loan.currency,
      receivedOn: fd.get("receivedOn"),
      method: fd.get("method"),
      bank: fd.get("bank"),
    };
    const formEl = e.currentTarget;
    start(async () => {
      const res = await addLoanReceipt(input);
      if (res.ok) formEl.reset();
      else setError(res.error);
    });
  }

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <button onClick={() => setOpen((o) => !o)} className="focusring text-xs text-ink-muted hover:text-ink">
        {open ? "Hide" : "Show"} repayments ledger ({loan.receipts.length})
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {loan.receipts.length > 0 && (
            <div className="max-h-44 overflow-y-auto">
              {loan.receipts.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b border-border/40 py-1 text-xs">
                  <span className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${r.kind === "interest" ? "bg-accent-soft text-accent" : "bg-gain/10 text-gain"}`}>
                      {r.kind === "interest" ? "dobândă" : "principal"}
                    </span>
                    <span className="text-ink-muted">{r.receivedOn}</span>
                    <span className="text-ink-faint">
                      {r.method === "cash" ? "cash" : `transfer${r.bank ? ` · ${r.bank}` : ""}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tnum">{r.amount.toLocaleString("en-US")} {r.currency}</span>
                    {!readonly && (
                      <button onClick={() => start(async () => { await deleteLoanReceipt(r.id); })} disabled={pending} className="focusring rounded p-0.5 text-ink-faint hover:text-loss"><Trash2 size={12} /></button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!readonly && (
            <form onSubmit={onAdd} className="space-y-2 rounded-lg border border-border bg-panel p-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Type">
                  <select name="kind" defaultValue="principal" className={inputClass}>
                    <option value="principal">Principal</option>
                    <option value="interest">Dobândă (interest)</option>
                  </select>
                </Field>
                <Field label={`Amount (${loan.currency})`}>
                  <input name="amount" type="number" step="any" required className={inputClass} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Date received">
                  <input name="receivedOn" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
                </Field>
                <Field label="Method">
                  <select name="method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </Field>
              </div>
              {method === "bank_transfer" && (
                <Field label="Which bank">
                  <input name="bank" placeholder="e.g. Banca Transilvania" className={inputClass} />
                </Field>
              )}
              {error && <p className="text-xs text-loss">{error}</p>}
              <button type="submit" disabled={pending} className="focusring w-full rounded-lg bg-accent px-3 py-2 text-xs font-medium text-black hover:brightness-110 disabled:opacity-50">
                {pending ? "Saving…" : "Add repayment"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
