/** Per-page server aggregations (EUR). Server-only. */
import "server-only";
import {
  getCashflowIncome,
  getCashflowExpense,
  getRealizedTrades,
  getProperties,
  getPropertyRent,
  getPropertyLedger,
  getLoans,
  getLoanReceipts,
  getIncomeLegend,
  getDividends,
  getTransactions,
  getBusinesses,
  getBusinessLedger,
  getClients,
  getClientServices,
} from "@/db/queries";
import { getHoldingsModel } from "@/lib/aggregate";
import { getFxRates, toEur } from "@/lib/fx-server";
import { loanState, interestToDate, expectedTotalInterest, type Compounding } from "@/lib/finance";

// ---- Cash flow -----------------------------------------------------------
export async function getCashflow() {
  const [income, expense, legend] = await Promise.all([
    getCashflowIncome(),
    getCashflowExpense(),
    getIncomeLegend(),
  ]);
  const legendMap = new Map(legend.map((l) => [l.label, l]));
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthly = months.map((m) => {
    const inc = income.filter((r) => r.month === m).reduce((s, r) => s + r.amountEur, 0);
    const exp = expense.filter((r) => r.month === m).reduce((s, r) => s + r.amountEur, 0);
    return { month: m, income: inc, expense: exp, savings: inc - exp, savingsRate: inc > 0 ? (inc - exp) / inc : null };
  });
  const activeMonths = monthly.filter((m) => m.income > 0 || m.expense > 0);
  const totalIncome = income.reduce((s, r) => s + r.amountEur, 0);
  const totalExpense = expense.reduce((s, r) => s + r.amountEur, 0);
  const ytdSavingsRate = totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : 0;

  const byClient = groupSum(income, (r) => r.label).slice(0, 12);
  const byCategory = groupSum(expense, (r) => r.category ?? "Other");
  const recurring = income.filter((r) => /retainer/i.test(r.label)).reduce((s, r) => s + r.amountEur, 0);

  // Income grouped by Legend category (tagged sources).
  const catMap = new Map<string, number>();
  let untaggedEur = 0;
  for (const r of income) {
    const tag = legendMap.get(r.label);
    const key = tag?.category ?? "other";
    if (!tag) untaggedEur += r.amountEur;
    catMap.set(key, (catMap.get(key) ?? 0) + r.amountEur);
  }
  const incomeByCategory = [...catMap.entries()]
    .map(([category, eur]) => ({ category, eur }))
    .sort((a, b) => b.eur - a.eur);

  // Distinct income sources + their current tag (for the Legend page).
  const sourceMap = new Map<string, number>();
  for (const r of income) sourceMap.set(r.label, (sourceMap.get(r.label) ?? 0) + r.amountEur);
  const sources = [...sourceMap.entries()]
    .map(([label, eur]) => {
      const tag = legendMap.get(label);
      return { label, eur, category: tag?.category ?? null, customLabel: tag?.customLabel ?? null };
    })
    .sort((a, b) => b.eur - a.eur);
  const untaggedCount = sources.filter((s) => !s.category).length;

  return {
    monthly: activeMonths,
    totalIncome,
    totalExpense,
    ytdSavingsRate,
    byClient,
    byCategory,
    incomeByCategory,
    untaggedEur,
    recurring,
    oneOff: totalIncome - recurring,
    sources,
    untaggedCount,
  };
}

function groupSum<T extends { amountEur: number }>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + r.amountEur);
  return [...m.entries()].map(([label, eur]) => ({ label, eur })).sort((a, b) => b.eur - a.eur);
}

// ---- Performance ---------------------------------------------------------
export async function getPerformance() {
  const [{ classes, realizedFromTxns }, realized, fx] = await Promise.all([
    getHoldingsModel(),
    getRealizedTrades(),
    getFxRates(),
  ]);
  const symbols = classes.flatMap((c) => c.symbols);
  const withPct = symbols.filter((s) => s.unrealizedPct != null);
  const byPct = [...withPct].sort((a, b) => (b.unrealizedPct! - a.unrealizedPct!));
  const byAbs = [...symbols].sort((a, b) => b.unrealizedPlEur - a.unrealizedPlEur);

  // Realized from imported "Past Trades" PLUS realized from sell transactions.
  const realizedEur = [
    ...realized.map((t) => ({ assetClass: t.assetClass, closeDate: t.closeDate, plEur: toEur(t.pl, t.currency, fx.rates) })),
    ...realizedFromTxns.map((t) => ({ assetClass: t.assetClass, closeDate: t.closeDate, plEur: t.plEur })),
  ];
  const realizedByClass = groupBy(realizedEur, (t) => t.assetClass);
  const realizedByYear = groupBy(
    realizedEur.filter((t) => t.closeDate),
    (t) => String(new Date(t.closeDate!).getFullYear()),
  );
  const totalRealized = realizedEur.reduce((s, t) => s + t.plEur, 0);
  const totalUnrealized = symbols.reduce((s, t) => s + t.unrealizedPlEur, 0);

  return {
    bestPct: byPct.slice(0, 5),
    worstPct: byPct.slice(-5).reverse(),
    bestAbs: byAbs.slice(0, 5),
    worstAbs: byAbs.slice(-5).reverse(),
    realizedByClass,
    realizedByYear,
    totalRealized,
    totalUnrealized,
  };
}

function groupBy<T extends { plEur: number }>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, { pl: number; count: number }>();
  for (const r of rows) {
    const k = key(r);
    const cur = m.get(k) ?? { pl: 0, count: 0 };
    cur.pl += r.plEur;
    cur.count++;
    m.set(k, cur);
  }
  return [...m.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.pl - a.pl);
}

// ---- Real estate ---------------------------------------------------------
export async function getRealEstate() {
  const [props, rent, ledger, fx] = await Promise.all([
    getProperties(),
    getPropertyRent(),
    getPropertyLedger(),
    getFxRates(),
  ]);
  return props.map((p) => {
    const valueEur = toEur(p.value, p.currency, fx.rates);

    // Itemised cost / sale ledger (overrides single purchase/sale price).
    const myLedger = ledger.filter((l) => l.propertyId === p.id);
    const acquisitions = myLedger
      .filter((l) => l.kind === "acquisition")
      .map((l) => ({ ...l, eur: toEur(l.amount, l.currency, fx.rates) }));
    const sales = myLedger
      .filter((l) => l.kind === "sale")
      .map((l) => ({ ...l, eur: toEur(l.amount, l.currency, fx.rates) }));

    const ledgerInvestmentEur = acquisitions.reduce((s, l) => s + l.eur, 0);
    const ledgerSaleEur = sales.reduce((s, l) => s + l.eur, 0);

    // Fall back to the single purchase/sale price when no ledger items exist.
    const purchaseEur =
      acquisitions.length > 0
        ? ledgerInvestmentEur
        : p.purchasePrice != null
          ? toEur(p.purchasePrice, p.currency, fx.rates)
          : null;
    const saleEur =
      sales.length > 0
        ? ledgerSaleEur
        : p.salePrice != null
          ? toEur(p.salePrice, p.currency, fx.rates)
          : null;
    // ROI denominator: total investment if known, else current value.
    const basisEur = purchaseEur && purchaseEur > 0 ? purchaseEur : valueEur;

    const myRent = rent.filter((r) => r.propertyId === p.id);
    // Group rent by year, converting each entry to EUR.
    const yearMap = new Map<number, { eur: number; entries: typeof myRent }>();
    for (const r of myRent) {
      const cur = yearMap.get(r.year) ?? { eur: 0, entries: [] };
      cur.eur += toEur(r.amount, r.currency, fx.rates);
      cur.entries.push(r);
      yearMap.set(r.year, cur);
    }
    const years = [...yearMap.entries()]
      .map(([year, v]) => ({
        year,
        incomeEur: v.eur,
        roi: basisEur > 0 ? v.eur / basisEur : 0,
        entries: v.entries.sort((a, b) => (a.month ?? 0) - (b.month ?? 0)),
      }))
      .sort((a, b) => a.year - b.year);

    const totalRentEur = years.reduce((s, y) => s + y.incomeEur, 0);
    const cumulativeRoi = basisEur > 0 ? totalRentEur / basisEur : 0;

    // Capital gain realised once there are sale proceeds (or status sold).
    const realised = sales.length > 0 || p.status === "sold";
    const capitalGainEur = realised && saleEur != null && purchaseEur != null ? saleEur - purchaseEur : null;

    // "Total venit" = sale proceeds + all rent received.
    const totalIncomeEur = (saleEur ?? 0) + totalRentEur;
    // Net profit vs total investment.
    const netProfitEur = purchaseEur != null ? totalIncomeEur - purchaseEur : null;
    const totalRoi = purchaseEur && purchaseEur > 0 ? totalIncomeEur / purchaseEur - 1 : null;

    return {
      id: p.id,
      name: p.name,
      value: p.value,
      currency: p.currency,
      monthlyRent: p.monthlyRent,
      valueEur,
      monthlyRentEur: toEur(p.monthlyRent, p.currency, fx.rates),
      isRented: p.isRented,
      status: p.status,
      purchaseDate: p.purchaseDate,
      purchasePrice: p.purchasePrice,
      purchaseEur,
      saleDate: p.saleDate,
      salePrice: p.salePrice,
      saleEur,
      capitalGainEur,
      notes: p.notes,
      acquisitions: acquisitions.map((l) => ({ id: l.id, label: l.label, eur: l.eur, amount: l.amount, currency: l.currency })),
      sales: sales.map((l) => ({ id: l.id, label: l.label, eur: l.eur, amount: l.amount, currency: l.currency })),
      years,
      totalRentEur,
      cumulativeRoi,
      investmentEur: purchaseEur,
      saleProceedsEur: saleEur,
      totalIncomeEur,
      netProfitEur,
      totalRoi,
    };
  });
}

// ---- Loans ---------------------------------------------------------------
export async function getLoansModel() {
  const [loans, receipts, fx] = await Promise.all([
    getLoans(),
    getLoanReceipts(),
    getFxRates(),
  ]);
  const now = new Date();
  return loans.map((l) => {
    const myReceipts = receipts.filter((r) => r.loanId === l.id);
    const start = l.startDate ? new Date(l.startDate) : now;
    // Metrics are driven solely by the manual receipts ledger (no schedule).
    const state = loanState(
      l.principal,
      start,
      [],
      myReceipts.map((r) => ({ date: new Date(r.receivedOn), amount: r.amount, kind: r.kind as "principal" | "interest" })),
    );
    const expectedInterest = expectedTotalInterest(
      l.principal,
      l.interestRate,
      l.termMonths ?? 0,
      l.compounding as Compounding,
    );
    const interestEarned = interestToDate(
      l.principal,
      l.interestRate,
      start,
      now,
      l.termMonths,
      l.compounding as Compounding,
    );
    return {
      ...l,
      principalEur: toEur(l.principal, l.currency, fx.rates),
      receipts: myReceipts,
      expectedInterest,
      interestEarned,
      interestReceived: state.interestReceived,
      principalRepaid: state.principalRepaid,
      principalRemaining: state.principalRemaining,
      paidCount: state.paidCount,
      totalCount: state.totalCount,
      nextDue: state.nextDue ? { date: state.nextDue.date.toISOString().slice(0, 10), amount: state.nextDue.amount } : null,
      irr: state.irr,
    };
  });
}

// ---- Dividends -----------------------------------------------------------
/**
 * Passive-income view. Each dividend's cash is the after-tax net amount entered
 * for it (legacy rows fall back to shares-on-ex-date × amountPerShare), converted
 * to EUR. Derives TTM income, yield-on-cost per holding (trailing actual income
 * over invested cost), and a 12-month calendar.
 */
export async function getDividendModel() {
  const [divs, txns, { classes }, fx, realizedTrades] = await Promise.all([
    getDividends(),
    getTransactions(),
    getHoldingsModel(),
    getFxRates(),
    getRealizedTrades(),
  ]);

  // Net shares of a symbol held on (≤) a given ISO date, buys minus sells.
  // Open transactions alone understate the historical position for tickers that
  // have since been fully sold — their buy lots get archived to realized_trades
  // and removed from `transactions`, sometimes leaving an unmatched sell (which
  // makes the count go negative). So we add back any realized round-trip that
  // was still open on the date: it contributed `quantity` shares while held
  // (openDate ≤ date < closeDate).
  const sharesOn = (symbol: string, assetClass: string, onDate: string) => {
    const fromOpen = txns
      .filter((t) => t.symbol === symbol && t.assetClass === assetClass && t.tradeDate <= onDate)
      .reduce((s, t) => s + (t.direction === "sell" ? -t.quantity : t.quantity), 0);
    const fromRealized = realizedTrades
      .filter(
        (t) =>
          t.symbol === symbol &&
          t.assetClass === assetClass &&
          t.openDate != null &&
          t.openDate <= onDate &&
          (t.closeDate == null || t.closeDate > onDate),
      )
      .reduce((s, t) => s + t.quantity, 0);
    return fromOpen + fromRealized;
  };

  // Current invested (EUR) + current shares per symbol, from the holdings model.
  const holding = new Map<string, { investedEur: number; quantity: number }>();
  for (const c of classes)
    for (const s of c.symbols) holding.set(`${s.assetClass}::${s.symbol}`, { investedEur: s.investedEur, quantity: s.quantity });

  const today = new Date().toISOString().slice(0, 10);
  const ttmCutoff = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);

  // Enrich each dividend with the EUR cash it produced. Prefer the after-tax
  // net amount entered for the row; legacy rows (netAmount == null) fall back to
  // per-share × shares held on the ex-date.
  const enriched = divs.map((d) => {
    const onDate = d.exDate ?? d.payDate;
    const shares = sharesOn(d.symbol, d.assetClass, onDate);
    const netNative = d.netAmount ?? shares * d.amountPerShare;
    const cashEur = toEur(netNative, d.currency, fx.rates);
    return { ...d, shares, netNative, cashEur };
  });

  const ttmIncomeEur = enriched.filter((d) => d.payDate >= ttmCutoff).reduce((s, d) => s + d.cashEur, 0);

  // Per-holding summary. Annual income is the trailing-12m cash actually
  // received (in EUR) — not a per-share projection — so it stays correct even
  // when share counts change from selling.
  const bySymbol = new Map<string, { symbol: string; assetClass: string; ttmCashEur: number; currency: string; lastPay: string | null; nextPay: string | null }>();
  for (const d of enriched) {
    const key = `${d.assetClass}::${d.symbol}`;
    const cur = bySymbol.get(key) ?? { symbol: d.symbol, assetClass: d.assetClass, ttmCashEur: 0, currency: d.currency, lastPay: null, nextPay: null };
    if (d.payDate >= ttmCutoff && d.payDate <= today) cur.ttmCashEur += d.cashEur;
    if (d.payDate <= today && (!cur.lastPay || d.payDate > cur.lastPay)) cur.lastPay = d.payDate;
    if (d.payDate > today && (!cur.nextPay || d.payDate < cur.nextPay)) cur.nextPay = d.payDate;
    bySymbol.set(key, cur);
  }

  const holdings = [...bySymbol.entries()].map(([key, v]) => {
    const h = holding.get(key);
    const shares = h?.quantity ?? 0;
    const investedEur = h?.investedEur ?? 0;
    const annualEur = v.ttmCashEur;
    const yieldOnCost = investedEur > 0 ? annualEur / investedEur : null;
    return {
      symbol: v.symbol,
      assetClass: v.assetClass,
      shares,
      annualEur,
      yieldOnCost,
      lastPay: v.lastPay,
      nextPay: v.nextPay,
      currency: v.currency,
    };
  }).sort((a, b) => b.annualEur - a.annualEur);

  const projectedAnnualEur = holdings.reduce((s, h) => s + h.annualEur, 0);
  const totalInvestedEur = [...holding.values()].reduce((s, h) => s + h.investedEur, 0);
  const portfolioYoc = totalInvestedEur > 0 ? projectedAnnualEur / totalInvestedEur : null;

  // 12-month payout calendar (trailing), EUR by month label.
  const months: { label: string; eur: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short" });
    const eur = enriched.filter((x) => x.payDate.slice(0, 7) === ym).reduce((s, x) => s + x.cashEur, 0);
    months.push({ label, eur });
  }

  return {
    ttmIncomeEur,
    projectedAnnualEur,
    portfolioYoc,
    holdings,
    calendar: months,
    ledger: enriched
      .slice()
      .sort((a, b) => (a.payDate < b.payDate ? 1 : -1))
      .map((d) => ({ id: d.id, symbol: d.symbol, assetClass: d.assetClass, exDate: d.exDate, payDate: d.payDate, netNative: d.netNative, currency: d.currency, shares: d.shares, cashEur: d.cashEur, note: d.note })),
  };
}

// ---- Businesses ----------------------------------------------------------
/**
 * Per-business model: the P&L ledger grouped by year (revenue, COGS, ad spend,
 * other expenses), with gross profit + margin, plus the current valuation. All
 * amounts normalised to EUR via live FX. Mirrors getRealEstate's shape.
 */
export async function getBusinessesModel() {
  const [biz, ledger, fx] = await Promise.all([
    getBusinesses(),
    getBusinessLedger(),
    getFxRates(),
  ]);

  return biz.map((b) => {
    const valuationEur = b.valuation != null ? toEur(b.valuation, b.currency, fx.rates) : null;
    const mine = ledger.filter((l) => l.businessId === b.id);

    // Group by year → per-kind EUR totals.
    const yearMap = new Map<
      number,
      { revenue: number; cogs: number; adSpend: number; expense: number; entries: typeof mine }
    >();
    for (const e of mine) {
      const cur = yearMap.get(e.year) ?? { revenue: 0, cogs: 0, adSpend: 0, expense: 0, entries: [] };
      const eur = toEur(e.amount, e.currency, fx.rates);
      if (e.kind === "revenue") cur.revenue += eur;
      else if (e.kind === "cogs") cur.cogs += eur;
      else if (e.kind === "ad_spend") cur.adSpend += eur;
      else if (e.kind === "expense") cur.expense += eur;
      cur.entries.push(e);
      yearMap.set(e.year, cur);
    }

    const years = [...yearMap.entries()]
      .map(([year, v]) => {
        const grossProfit = v.revenue - v.cogs;
        const netProfit = v.revenue - v.cogs - v.adSpend - v.expense;
        return {
          year,
          revenueEur: v.revenue,
          cogsEur: v.cogs,
          adSpendEur: v.adSpend,
          expenseEur: v.expense,
          grossProfitEur: grossProfit,
          grossMargin: v.revenue > 0 ? grossProfit / v.revenue : null,
          netProfitEur: netProfit,
          netMargin: v.revenue > 0 ? netProfit / v.revenue : null,
          entries: v.entries
            .slice()
            .sort((a, c) => (a.month ?? 0) - (c.month ?? 0)),
        };
      })
      .sort((a, c) => a.year - c.year);

    const totalRevenueEur = years.reduce((s, y) => s + y.revenueEur, 0);
    const totalCogsEur = years.reduce((s, y) => s + y.cogsEur, 0);
    const totalGrossProfitEur = totalRevenueEur - totalCogsEur;
    const lifetimeGrossMargin = totalRevenueEur > 0 ? totalGrossProfitEur / totalRevenueEur : null;

    return {
      id: b.id,
      name: b.name,
      currency: b.currency,
      status: b.status,
      valuation: b.valuation,
      valuationEur,
      startedOn: b.startedOn,
      notes: b.notes,
      years,
      totalRevenueEur,
      totalCogsEur,
      totalGrossProfitEur,
      lifetimeGrossMargin,
      ledger: mine.map((e) => ({
        id: e.id,
        year: e.year,
        month: e.month,
        kind: e.kind,
        amount: e.amount,
        currency: e.currency,
        label: e.label,
        eur: toEur(e.amount, e.currency, fx.rates),
      })),
    };
  });
}

// ---- Clients -------------------------------------------------------------
/**
 * Per-client model: each service line annualised to a common basis so we can
 * derive MRR / ARR / one-off totals, plus an upcoming-renewals list. Hourly
 * lines value at hours × rate (no time logging yet). All EUR via live FX.
 */
export async function getClientsModel() {
  const [cls, services, fx] = await Promise.all([
    getClients(),
    getClientServices(),
    getFxRates(),
  ]);

  // Monthly-equivalent + one-off EUR for one service line.
  const annualise = (s: (typeof services)[number]) => {
    const base =
      s.type === "hourly" && s.hours != null && s.rate != null ? s.hours * s.rate : s.amount;
    const baseEur = toEur(base, s.currency, fx.rates);
    let monthlyEur = 0;
    let oneOffEur = 0;
    switch (s.cadence) {
      case "weekly":
        monthlyEur = (baseEur * 52) / 12;
        break;
      case "monthly":
        monthlyEur = baseEur;
        break;
      case "quarterly":
        monthlyEur = (baseEur * 4) / 12;
        break;
      case "four_monthly":
        monthlyEur = (baseEur * 3) / 12;
        break;
      case "annual":
        monthlyEur = baseEur / 12;
        break;
      case "times_per_year":
        monthlyEur = (baseEur * (s.timesPerYear ?? 1)) / 12;
        break;
      case "one_off":
        oneOffEur = baseEur;
        break;
    }
    return { baseEur, monthlyEur, oneOffEur };
  };

  const today = new Date().toISOString().slice(0, 10);
  const renewalHorizon = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
  const renewals: {
    clientId: number;
    clientName: string;
    type: string;
    label: string | null;
    renewalDate: string;
    daysUntil: number;
    amountEur: number;
  }[] = [];

  const clientViews = cls.map((c) => {
    const mine = services.filter((s) => s.clientId === c.id);
    const lines = mine.map((s) => {
      const a = annualise(s);
      if (s.renewalDate && s.renewalDate <= renewalHorizon && s.active) {
        renewals.push({
          clientId: c.id,
          clientName: c.name,
          type: s.type,
          label: s.label,
          renewalDate: s.renewalDate,
          daysUntil: Math.round((new Date(s.renewalDate).getTime() - new Date(today).getTime()) / 86_400_000),
          amountEur: a.baseEur,
        });
      }
      return {
        id: s.id,
        type: s.type,
        label: s.label,
        amount: s.amount,
        currency: s.currency,
        cadence: s.cadence,
        timesPerYear: s.timesPerYear,
        hours: s.hours,
        rate: s.rate,
        startDate: s.startDate,
        renewalDate: s.renewalDate,
        active: s.active,
        notes: s.notes,
        monthlyEur: a.monthlyEur,
        oneOffEur: a.oneOffEur,
      };
    });
    const activeLines = lines.filter((l) => l.active);
    const mrrEur = activeLines.reduce((s, l) => s + l.monthlyEur, 0);
    const oneOffEur = lines.reduce((s, l) => s + l.oneOffEur, 0);
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      currency: c.currency,
      notes: c.notes,
      services: lines,
      mrrEur,
      arrEur: mrrEur * 12,
      oneOffEur,
    };
  });

  const activeClients = clientViews.filter((c) => c.status === "active");
  const totalMrrEur = activeClients.reduce((s, c) => s + c.mrrEur, 0);
  const totalOneOffEur = clientViews.reduce((s, c) => s + c.oneOffEur, 0);

  renewals.sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    clients: clientViews,
    totalMrrEur,
    totalArrEur: totalMrrEur * 12,
    totalOneOffEur,
    activeCount: activeClients.length,
    renewals,
  };
}
