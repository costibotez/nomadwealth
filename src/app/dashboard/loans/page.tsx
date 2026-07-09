import { getLoansModel } from "@/lib/page-data";
import { getNetWorthModel } from "@/lib/aggregate";
import { getLoanPayments, getUpcomingLoanPayments } from "@/db/queries";
import { LoansClient, type LoanCard } from "@/components/loans/LoansClient";

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  const [loans, nw, payments, upcoming] = await Promise.all([
    getLoansModel(),
    getNetWorthModel(),
    getLoanPayments(),
    getUpcomingLoanPayments(14),
  ]);
  const cards: LoanCard[] = loans.map((l) => ({
    id: l.id,
    borrower: l.borrower,
    principal: l.principal,
    currency: l.currency,
    backed: l.backed,
    startDate: l.startDate,
    interestRate: l.interestRate,
    compounding: l.compounding,
    termMonths: l.termMonths,
    status: l.status,
    notes: l.notes,
    principalEur: l.principalEur,
    receipts: l.receipts.map((r) => ({
      id: r.id, kind: r.kind, amount: r.amount, currency: r.currency,
      receivedOn: r.receivedOn, method: r.method, bank: r.bank,
    })),
    payments: payments
      .filter((p) => p.loanId === l.id)
      .map((p) => ({ id: p.id, dueDate: p.dueDate, amount: p.amount, currency: p.currency, paid: p.paid, paidDate: p.paidDate })),
    expectedInterest: l.expectedInterest,
    interestEarned: l.interestEarned,
    interestReceived: l.interestReceived,
    principalRepaid: l.principalRepaid,
    principalRemaining: l.principalRemaining,
    nextDue: l.nextDue,
    irr: l.irr,
  }));
  const dueSoon = upcoming.map((u) => ({
    id: u.id,
    borrower: u.borrower,
    amount: u.amount,
    currency: u.currency,
    dueDate: u.dueDate,
    daysUntil: u.daysUntil,
    overdue: u.overdue,
  }));
  return <LoansClient loans={cards} totalNetWorthEur={nw.totalNetWorthEur} dueSoon={dueSoon} />;
}
