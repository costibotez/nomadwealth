/**
 * Builds the canonical net-worth model in EUR from the DB tables.
 * Server-only. Pages call these and pass plain EUR numbers to client components,
 * which convert to the display currency via the CurrencyProvider.
 */
import "server-only";
import {
  getTransactions,
  getAccounts,
  getLoans,
  getLoanReceipts,
  getProperties,
  getRealizedTrades,
  getBusinesses,
  type TransactionRow,
} from "@/db/queries";
import { getFxRates, toEur } from "@/lib/fx-server";
import { loanState, interestToDate, type Compounding } from "@/lib/finance";
import { movingAverageBasis } from "@/lib/cost-basis";

export const ASSET_CLASS_LABELS: Record<string, string> = {
  ro_stock: "RO Stocks",
  us_stock: "US Stocks",
  crypto: "Crypto",
  reit: "Crowdfunding REIT",
  mutual_fund: "Mutual Funds",
  gold: "Gold",
  other: "Other",
};

const GEO: Record<string, "Romania" | "US" | "Crypto" | "Global"> = {
  ro_stock: "Romania",
  reit: "Romania",
  mutual_fund: "Romania",
  us_stock: "US",
  crypto: "Crypto",
  gold: "Global",
  other: "Global",
};

export interface SymbolHolding {
  symbol: string;
  assetClass: string;
  currency: string; // native price currency (for currency-exposure buckets)
  quantity: number;
  avgCost: number; // native
  investedEur: number;
  currentValueEur: number;
  unrealizedPlEur: number;
  unrealizedPct: number | null;
  avgHoldingDays: number | null;
  maturityDate: string | null;
  lots: TransactionRow[];
}

export interface ClassHolding {
  assetClass: string;
  label: string;
  investedEur: number;
  currentValueEur: number;
  unrealizedPlEur: number;
  unrealizedPct: number | null;
  symbols: SymbolHolding[];
}

function daysBetween(iso: string): number {
  const d = new Date(iso).getTime();
  return Math.max(0, Math.round((Date.now() - d) / 86400000));
}

export interface RealizedFromTxn {
  symbol: string;
  assetClass: string;
  closeDate: string;
  quantity: number;
  costEur: number;
  proceedsEur: number;
  plEur: number;
}

export async function getHoldingsModel() {
  const [txns, fx] = await Promise.all([getTransactions(), getFxRates()]);

  // Group ALL transactions (buys + sells) per symbol so sells net against buys.
  const bySymbol = new Map<string, TransactionRow[]>();
  for (const t of txns) {
    const key = `${t.assetClass}::${t.symbol}`;
    (bySymbol.get(key) ?? bySymbol.set(key, []).get(key)!).push(t);
  }

  const symbols: SymbolHolding[] = [];
  const realizedFromTxns: RealizedFromTxn[] = [];

  for (const [key, allLots] of bySymbol) {
    const [assetClass, symbol] = key.split("::");

    // Moving-average cost basis: processes buys/sells chronologically, converts
    // each lot to EUR, and resets when a position is fully closed (so a re-buy
    // does not inherit a sold-out lot's cost). See src/lib/cost-basis.ts.
    const basis = movingAverageBasis(allLots, (amount, currency) =>
      toEur(amount, currency, fx.rates),
    );
    for (const r of basis.realized) {
      realizedFromTxns.push({ symbol, assetClass, ...r });
    }

    const remainingQty = basis.remainingQty;
    // Fully-closed positions drop out of the holdings table (realized P/L kept).
    if (remainingQty <= 1e-9) continue;

    // Display extras derived from the buy lots (current price is the same for
    // every lot of a symbol; last one iterated wins).
    let daysSum = 0,
      daysN = 0;
    let maturityDate: string | null = null;
    let priceEurPerShare = 0;
    let priceCurrency = "EUR";
    for (const l of allLots) {
      if (l.direction !== "buy") continue;
      daysSum += daysBetween(l.tradeDate);
      daysN++;
      if (l.maturityDate) maturityDate = l.maturityDate;
      priceEurPerShare = toEur(l.currentPrice, l.priceCurrency, fx.rates);
      priceCurrency = l.priceCurrency;
    }

    const avgCostNative = basis.avgCostNative;
    const investedEur = basis.investedEur;
    const currentValueEur = priceEurPerShare * remainingQty;
    const unrealizedPlEur = currentValueEur - investedEur;
    symbols.push({
      symbol,
      assetClass,
      currency: priceCurrency,
      quantity: remainingQty,
      avgCost: avgCostNative,
      investedEur,
      currentValueEur,
      unrealizedPlEur,
      unrealizedPct: investedEur > 0 ? unrealizedPlEur / investedEur : null,
      avgHoldingDays: daysN ? Math.round(daysSum / daysN) : null,
      maturityDate,
      lots: allLots,
    });
  }

  const classMap = new Map<string, ClassHolding>();
  for (const s of symbols) {
    let c = classMap.get(s.assetClass);
    if (!c) {
      c = {
        assetClass: s.assetClass,
        label: ASSET_CLASS_LABELS[s.assetClass] ?? s.assetClass,
        investedEur: 0,
        currentValueEur: 0,
        unrealizedPlEur: 0,
        unrealizedPct: null,
        symbols: [],
      };
      classMap.set(s.assetClass, c);
    }
    c.investedEur += s.investedEur;
    c.currentValueEur += s.currentValueEur;
    c.unrealizedPlEur += s.unrealizedPlEur;
    c.symbols.push(s);
  }
  const classes = [...classMap.values()].map((c) => ({
    ...c,
    unrealizedPct: c.investedEur > 0 ? c.unrealizedPlEur / c.investedEur : null,
    symbols: c.symbols.sort((a, b) => b.currentValueEur - a.currentValueEur),
  }));
  classes.sort((a, b) => b.currentValueEur - a.currentValueEur);

  return { classes, fx, realizedFromTxns };
}

export interface NetWorthModel {
  fx: { asOf: string; stale: boolean; source: string };
  totalNetWorthEur: number;
  personalNetWorthEur: number;
  companyCashEur: number;
  totalInvestedEur: number;
  totalCurrentValueEur: number;
  unrealizedPlEur: number;
  unrealizedPct: number | null;
  realizedPlYtdEur: number;
  components: {
    investmentsEur: number;
    accountsEur: number;
    loansEur: number;
    propertiesEur: number;
    businessesEur: number;
  };
  allocationByClass: { key: string; label: string; valueEur: number }[];
  allocationByGeography: { key: string; valueEur: number }[];
  currencyExposure: { currency: string; valueEur: number }[];
  concentration: {
    largestSymbol: string;
    largestPct: number;
    // Home-market concentration: the share of net worth denominated in your
    // single largest currency. Auto-detected from the actual per-asset currency
    // mix — portable to any buyer, with no hardcoded country assumption.
    homeMarket: { currency: string; pct: number };
    illiquidPct: number;
  };
}

export async function getNetWorthModel(): Promise<NetWorthModel> {
  const [{ classes, fx, realizedFromTxns }, accounts, loans, receipts, properties, realized, businessRows] =
    await Promise.all([
      getHoldingsModel(),
      getAccounts(),
      getLoans(),
      getLoanReceipts(),
      getProperties(),
      getRealizedTrades(),
      getBusinesses(),
    ]);

  const investmentsEur = classes.reduce((s, c) => s + c.currentValueEur, 0);
  const investedEur = classes.reduce((s, c) => s + c.investedEur, 0);

  const accountsEur = accounts.reduce((s, a) => s + toEur(a.balance, a.currency, fx.rates), 0);
  const companyCashEur = accounts
    .filter((a) => a.isCompany)
    .reduce((s, a) => s + toEur(a.balance, a.currency, fx.rates), 0);

  // Loans receivable: remaining principal + interest accrued to date, in EUR.
  const receiptsByLoan = new Map<number, typeof receipts>();
  for (const r of receipts) {
    (receiptsByLoan.get(r.loanId) ?? receiptsByLoan.set(r.loanId, []).get(r.loanId)!).push(r);
  }
  let loansEur = 0;
  for (const l of loans) {
    if (l.status === "repaid" || l.status === "defaulted") continue;
    const rcpts = receiptsByLoan.get(l.id) ?? [];
    const start = l.startDate ? new Date(l.startDate) : new Date();
    const state = loanState(
      l.principal,
      start,
      [],
      rcpts.map((r) => ({ date: new Date(r.receivedOn), amount: r.amount, kind: r.kind as "principal" | "interest" })),
    );
    const interest = interestToDate(
      l.principal,
      l.interestRate,
      start,
      new Date(),
      l.termMonths,
      l.compounding as Compounding,
    );
    // Outstanding = principal not yet repaid + accrued-but-unreceived interest.
    const outstandingNative = state.principalRemaining + Math.max(0, interest - state.interestReceived);
    loansEur += toEur(outstandingNative, l.currency, fx.rates);
  }

  // Sold properties no longer sit in net worth (proceeds moved to cash).
  const propertiesEur = properties
    .filter((p) => p.status !== "sold")
    .reduce((s, p) => s + toEur(p.value, p.currency, fx.rates), 0);

  // Active businesses with a valuation count toward net worth (like a property's
  // value). Sold/closed businesses, and those without a valuation, are excluded.
  const businessesEur = businessRows
    .filter((b) => b.status === "active" && b.valuation != null)
    .reduce((s, b) => s + toEur(b.valuation as number, b.currency, fx.rates), 0);

  const totalNetWorthEur = investmentsEur + accountsEur + loansEur + propertiesEur + businessesEur;
  const personalNetWorthEur = totalNetWorthEur - companyCashEur;

  const thisYear = new Date().getFullYear();
  const realizedPlYtdEur =
    realized
      .filter((t) => t.closeDate && new Date(t.closeDate).getFullYear() === thisYear)
      .reduce((s, t) => s + toEur(t.pl, t.currency, fx.rates), 0) +
    realizedFromTxns
      .filter((t) => new Date(t.closeDate).getFullYear() === thisYear)
      .reduce((s, t) => s + t.plEur, 0);

  // Allocation by class (+ property/loan/cash as their own slices)
  const allocationByClass = [
    ...classes.map((c) => ({ key: c.assetClass, label: c.label, valueEur: c.currentValueEur })),
    { key: "property", label: "Real Estate", valueEur: propertiesEur },
    { key: "loans", label: "Loans", valueEur: loansEur },
    { key: "cash", label: "Cash", valueEur: accountsEur },
    { key: "businesses", label: "Businesses", valueEur: businessesEur },
  ].filter((x) => x.valueEur > 0);

  // Geography
  const geo = new Map<string, number>();
  const addGeo = (k: string, v: number) => geo.set(k, (geo.get(k) ?? 0) + v);
  for (const c of classes) addGeo(GEO[c.assetClass] ?? "Global", c.currentValueEur);
  addGeo("Romania", propertiesEur + loansEur);
  for (const a of accounts)
    addGeo(a.currency === "RON" ? "Romania" : "Global", toEur(a.balance, a.currency, fx.rates));
  const allocationByGeography = [...geo.entries()].map(([key, valueEur]) => ({ key, valueEur }));

  // Currency exposure by native currency
  const allSymbols = classes.flatMap((c) => c.symbols);
  const cur = new Map<string, number>();
  const addCur = (c: string, v: number) => cur.set(c, (cur.get(c) ?? 0) + v);
  // Investments bucket by each holding's own price currency (RO stocks in RON,
  // US stocks in USD, …) rather than assuming a single currency.
  for (const s of allSymbols) addCur(s.currency, s.currentValueEur);
  for (const a of accounts) addCur(a.currency, toEur(a.balance, a.currency, fx.rates));
  for (const p of properties) addCur(p.currency, toEur(p.value, p.currency, fx.rates));
  for (const b of businessRows) {
    if (b.status === "active" && b.valuation != null) addCur(b.currency, toEur(b.valuation, b.currency, fx.rates));
  }
  for (const l of loans) {
    if (l.status === "active") addCur(l.currency, toEur(l.principal, l.currency, fx.rates));
  }
  const currencyExposure = [...cur.entries()]
    .map(([currency, valueEur]) => ({ currency, valueEur }))
    .sort((a, b) => b.valueEur - a.valueEur);

  // Concentration
  const largest = allSymbols.reduce(
    (m, s) => (s.currentValueEur > m.currentValueEur ? s : m),
    { symbol: "—", currentValueEur: 0 } as { symbol: string; currentValueEur: number },
  );
  // Home market = the single largest currency bucket (currencyExposure is sorted
  // desc), so it names whichever currency the buyer is most exposed to.
  const homeBucket = currencyExposure[0] ?? { currency: "EUR", valueEur: 0 };
  const illiquidEur = propertiesEur + loansEur;

  return {
    fx: { asOf: fx.asOf, stale: fx.stale, source: fx.source },
    totalNetWorthEur,
    personalNetWorthEur,
    companyCashEur,
    totalInvestedEur: investedEur,
    totalCurrentValueEur: investmentsEur,
    unrealizedPlEur: investmentsEur - investedEur,
    unrealizedPct: investedEur > 0 ? (investmentsEur - investedEur) / investedEur : null,
    realizedPlYtdEur,
    components: { investmentsEur, accountsEur, loansEur, propertiesEur, businessesEur },
    allocationByClass,
    allocationByGeography,
    currencyExposure,
    concentration: {
      largestSymbol: largest.symbol,
      largestPct: totalNetWorthEur ? largest.currentValueEur / totalNetWorthEur : 0,
      homeMarket: {
        currency: homeBucket.currency,
        pct: totalNetWorthEur ? homeBucket.valueEur / totalNetWorthEur : 0,
      },
      illiquidPct: totalNetWorthEur ? illiquidEur / totalNetWorthEur : 0,
    },
  };
}
