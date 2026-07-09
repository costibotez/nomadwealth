/**
 * Pure financial maths. No I/O. Unit-tested in src/lib/__tests__.
 *
 * Covers:
 *  - average-cost aggregation + P/L for investment lots
 *  - loan interest accrual, expected interest, remaining balance
 *  - effective annualised yield (IRR) on actual cashflows
 */

// ---- Investment aggregation ---------------------------------------------
export interface Lot {
  symbol: string;
  quantity: number;
  unitCost: number; // native currency
  currentPrice: number; // native currency
}

export interface SymbolAggregate {
  symbol: string;
  quantity: number;
  invested: number;
  currentValue: number;
  avgCost: number;
  unrealizedPl: number;
  unrealizedPct: number | null; // null when cost basis is 0
}

export function aggregateSymbol(symbol: string, lots: Lot[]): SymbolAggregate {
  let quantity = 0;
  let invested = 0;
  let currentValue = 0;
  for (const l of lots) {
    quantity += l.quantity;
    invested += l.quantity * l.unitCost;
    currentValue += l.quantity * l.currentPrice;
  }
  const unrealizedPl = currentValue - invested;
  return {
    symbol,
    quantity,
    invested,
    currentValue,
    avgCost: quantity !== 0 ? invested / quantity : 0,
    unrealizedPl,
    unrealizedPct: invested > 0 ? unrealizedPl / invested : null,
  };
}

// ---- Loan maths ----------------------------------------------------------
export type Compounding = "simple" | "monthly" | "annual";

/** Expected total interest over the full term (no repayments modelled). */
export function expectedTotalInterest(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  compounding: Compounding,
): number {
  if (annualRatePct <= 0 || termMonths <= 0) return 0;
  const r = annualRatePct / 100;
  const years = termMonths / 12;
  if (compounding === "simple") return principal * r * years;
  if (compounding === "annual") return principal * (Math.pow(1 + r, years) - 1);
  // monthly
  const m = r / 12;
  return principal * (Math.pow(1 + m, termMonths) - 1);
}

/** Interest accrued between startDate and asOf (capped at term). */
export function interestToDate(
  principal: number,
  annualRatePct: number,
  startDate: Date,
  asOf: Date,
  termMonths: number | null,
  compounding: Compounding,
): number {
  if (annualRatePct <= 0) return 0;
  let elapsedMonths = monthsBetween(startDate, asOf);
  if (elapsedMonths <= 0) return 0;
  if (termMonths) elapsedMonths = Math.min(elapsedMonths, termMonths);
  return expectedTotalInterest(principal, annualRatePct, elapsedMonths, compounding);
}

export function monthsBetween(a: Date, b: Date): number {
  return (
    (b.getFullYear() - a.getFullYear()) * 12 +
    (b.getMonth() - a.getMonth()) +
    (b.getDate() - a.getDate()) / 30
  );
}

export interface Payment {
  date: Date;
  amount: number;
  paid: boolean;
}

export interface LoanReturn {
  principalRepaid: number;
  principalRemaining: number;
  paidCount: number;
  totalCount: number;
  nextDue: { date: Date; amount: number } | null;
  irr: number | null; // effective annual rate on actual cashflows
}

/**
 * Compute repayment progress + IRR. Outflow = principal at start (negative),
 * inflows = paid repayments (positive). IRR is annualised.
 */
export function loanReturn(
  principal: number,
  startDate: Date,
  payments: Payment[],
): LoanReturn {
  const sorted = [...payments].sort((a, b) => a.date.getTime() - b.date.getTime());
  const paid = sorted.filter((p) => p.paid);
  const principalRepaid = paid.reduce((s, p) => s + p.amount, 0);
  const nextUnpaid = sorted.find((p) => !p.paid) ?? null;

  const cashflows: { date: Date; amount: number }[] = [
    { date: startDate, amount: -principal },
    ...paid.map((p) => ({ date: p.date, amount: p.amount })),
  ];

  return {
    principalRepaid,
    principalRemaining: Math.max(0, principal - principalRepaid),
    paidCount: paid.length,
    totalCount: sorted.length,
    nextDue: nextUnpaid ? { date: nextUnpaid.date, amount: nextUnpaid.amount } : null,
    irr: cashflows.length >= 2 ? annualizedIRR(cashflows) : null,
  };
}

export interface Receipt {
  date: Date;
  amount: number;
  kind: "principal" | "interest";
}

export interface LoanState {
  principalRepaid: number;
  principalRemaining: number;
  interestReceived: number;
  paidCount: number; // scheduled payments ticked off
  totalCount: number;
  nextDue: { date: Date; amount: number } | null;
  irr: number | null;
}

/**
 * Combined loan state from a scheduled payment plan AND an ad-hoc receipts
 * ledger. Scheduled "paid" rows and `principal` receipts both reduce principal;
 * `interest` receipts are income. IRR runs over every actual inflow.
 */
export function loanState(
  principal: number,
  startDate: Date,
  payments: Payment[],
  receipts: Receipt[],
): LoanState {
  const scheduledPaid = payments.filter((p) => p.paid);
  const nextUnpaid = [...payments]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .find((p) => !p.paid) ?? null;

  const principalFromSchedule = scheduledPaid.reduce((s, p) => s + p.amount, 0);
  const principalFromReceipts = receipts
    .filter((r) => r.kind === "principal")
    .reduce((s, r) => s + r.amount, 0);
  const interestReceived = receipts
    .filter((r) => r.kind === "interest")
    .reduce((s, r) => s + r.amount, 0);

  const principalRepaid = principalFromSchedule + principalFromReceipts;

  const cashflows = [
    { date: startDate, amount: -principal },
    ...scheduledPaid.map((p) => ({ date: p.date, amount: p.amount })),
    ...receipts.map((r) => ({ date: r.date, amount: r.amount })),
  ];

  return {
    principalRepaid,
    principalRemaining: Math.max(0, principal - principalRepaid),
    interestReceived,
    paidCount: scheduledPaid.length,
    totalCount: payments.length,
    nextDue: nextUnpaid ? { date: nextUnpaid.date, amount: nextUnpaid.amount } : null,
    irr: cashflows.length >= 2 ? annualizedIRR(cashflows) : null,
  };
}

/**
 * Annualised IRR via bisection on NPV. Dates expressed in years from the first
 * cashflow. Returns null if it doesn't converge or has no sign change.
 */
export function annualizedIRR(
  cashflows: { date: Date; amount: number }[],
): number | null {
  if (cashflows.length < 2) return null;
  const t0 = cashflows[0].date.getTime();
  const years = cashflows.map(
    (c) => (c.date.getTime() - t0) / (365.25 * 24 * 3600 * 1000),
  );
  const npv = (rate: number) =>
    cashflows.reduce((s, c, i) => s + c.amount / Math.pow(1 + rate, years[i]), 0);

  let lo = -0.9999;
  let hi = 10;
  let flo = npv(lo);
  let fhi = npv(hi);
  if (isNaN(flo) || isNaN(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fmid = npv(mid);
    if (Math.abs(fmid) < 1e-7) return mid;
    if (flo * fmid < 0) {
      hi = mid;
      fhi = fmid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}

// ---- FIRE / compounding projection ---------------------------------------
export interface ProjectionInput {
  startingFinancial: number; // financial assets (excl. property)
  startingProperty: number;
  monthlyContribution: number;
  annualReturnPct: number;
  propertyGrowthPct: number;
  years: number;
}

export interface ProjectionPoint {
  year: number;
  financial: number;
  property: number;
  total: number;
  contributed: number;
}

export function projectNetWorth(input: ProjectionInput): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  const mRet = input.annualReturnPct / 100 / 12;
  let financial = input.startingFinancial;
  let property = input.startingProperty;
  let contributed = 0;
  points.push({
    year: 0,
    financial,
    property,
    total: financial + property,
    contributed,
  });
  for (let y = 1; y <= input.years; y++) {
    for (let m = 0; m < 12; m++) {
      financial = financial * (1 + mRet) + input.monthlyContribution;
      contributed += input.monthlyContribution;
    }
    property = property * (1 + input.propertyGrowthPct / 100);
    points.push({
      year: y,
      financial: round2(financial),
      property: round2(property),
      total: round2(financial + property),
      contributed: round2(contributed),
    });
  }
  return points;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
