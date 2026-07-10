/**
 * Fully fabricated data for the public /demo route. No DB access, no real
 * numbers — this must never reflect an actual buyer's (or our own) portfolio.
 * Shapes mirror what the real dashboard pages compute in src/lib/aggregate.ts
 * and src/db/queries.ts, so the same client components can render it verbatim.
 */
import type { TransactionRow } from "@/db/queries";
import type { DividendModel } from "@/components/dividends/DividendsClient";
import type { LoanCard, DueSoon } from "@/components/loans/LoansClient";
import type { ClientsModel } from "@/components/clients/ClientsClient";

const lot = (t: Omit<TransactionRow, "commission" | "saleTax" | "maturityDate" | "notes"> & Partial<TransactionRow>): TransactionRow => ({
  commission: null,
  saleTax: null,
  maturityDate: null,
  notes: null,
  ...t,
});

// ---- Holdings (open lots, one per symbol) ---------------------------------
const tlvLot = lot({ id: 1, tradeDate: "2025-05-24", direction: "buy", assetClass: "ro_stock", symbol: "BVB:TLV", quantity: 40000, unitCost: 1.89, costCurrency: "RON", currentPrice: 2.46, priceCurrency: "RON", commission: 45 });
const snpLot = lot({ id: 2, tradeDate: "2025-07-08", direction: "buy", assetClass: "ro_stock", symbol: "BVB:SNP", quantity: 55000, unitCost: 1.13, costCurrency: "RON", currentPrice: 1.29, priceCurrency: "RON", commission: 38 });
const aaplLot = lot({ id: 3, tradeDate: "2025-10-02", direction: "buy", assetClass: "us_stock", symbol: "AAPL", quantity: 60, unitCost: 165.6, costCurrency: "USD", currentPrice: 226.8, priceCurrency: "USD", commission: 5 });
const vooLot = lot({ id: 4, tradeDate: "2025-02-05", direction: "buy", assetClass: "us_stock", symbol: "VOO", quantity: 25, unitCost: 423.36, costCurrency: "USD", currentPrice: 505.44, priceCurrency: "USD", commission: 5 });
const btcLot = lot({ id: 5, tradeDate: "2024-11-10", direction: "buy", assetClass: "crypto", symbol: "BTC-USD", quantity: 0.45, unitCost: 37920, costCurrency: "USD", currentPrice: 58800, priceCurrency: "USD", commission: 20 });

// A closed round-trip so the Transactions tab has a realized gain to show.
const digiBuy = lot({ id: 6, tradeDate: "2025-01-15", direction: "buy", assetClass: "ro_stock", symbol: "BVB:DIGI", quantity: 3000, unitCost: 18, costCurrency: "RON", currentPrice: 21, priceCurrency: "RON", commission: 10 });
const digiSell = lot({ id: 7, tradeDate: "2025-09-20", direction: "sell", assetClass: "ro_stock", symbol: "BVB:DIGI", quantity: 3000, unitCost: 21, costCurrency: "RON", currentPrice: 21, priceCurrency: "RON", commission: 10, saleTax: 5 });

export const DEMO_TRANSACTIONS: TransactionRow[] = [
  digiSell,
  aaplLot,
  digiBuy,
  snpLot,
  tlvLot,
  vooLot,
  btcLot,
].sort((a, b) => (a.tradeDate < b.tradeDate ? 1 : -1));

export interface DemoSymbolHolding {
  symbol: string;
  assetClass: string;
  quantity: number;
  avgCost: number;
  investedEur: number;
  currentValueEur: number;
  unrealizedPlEur: number;
  unrealizedPct: number | null;
  avgHoldingDays: number | null;
  maturityDate: string | null;
  lots: TransactionRow[];
}
export interface DemoClassHolding {
  assetClass: string;
  label: string;
  investedEur: number;
  currentValueEur: number;
  unrealizedPlEur: number;
  unrealizedPct: number | null;
  symbols: DemoSymbolHolding[];
}

export const DEMO_HOLDINGS: DemoClassHolding[] = [
  {
    assetClass: "ro_stock",
    label: "RO Stocks",
    investedEur: 27700,
    currentValueEur: 34100,
    unrealizedPlEur: 6400,
    unrealizedPct: 0.2310,
    symbols: [
      { symbol: "BVB:TLV", assetClass: "ro_stock", quantity: 40000, avgCost: 1.89, investedEur: 15200, currentValueEur: 19800, unrealizedPlEur: 4600, unrealizedPct: 0.3026, avgHoldingDays: 410, maturityDate: null, lots: [tlvLot] },
      { symbol: "BVB:SNP", assetClass: "ro_stock", quantity: 55000, avgCost: 1.13, investedEur: 12500, currentValueEur: 14300, unrealizedPlEur: 1800, unrealizedPct: 0.1440, avgHoldingDays: 365, maturityDate: null, lots: [snpLot] },
    ],
  },
  {
    assetClass: "us_stock",
    label: "US Stocks",
    investedEur: 19000,
    currentValueEur: 24300,
    unrealizedPlEur: 5300,
    unrealizedPct: 0.2789,
    symbols: [
      { symbol: "AAPL", assetClass: "us_stock", quantity: 60, avgCost: 165.6, investedEur: 9200, currentValueEur: 12600, unrealizedPlEur: 3400, unrealizedPct: 0.3696, avgHoldingDays: 280, maturityDate: null, lots: [aaplLot] },
      { symbol: "VOO", assetClass: "us_stock", quantity: 25, avgCost: 423.36, investedEur: 9800, currentValueEur: 11700, unrealizedPlEur: 1900, unrealizedPct: 0.1939, avgHoldingDays: 520, maturityDate: null, lots: [vooLot] },
    ],
  },
  {
    assetClass: "crypto",
    label: "Crypto",
    investedEur: 15800,
    currentValueEur: 24500,
    unrealizedPlEur: 8700,
    unrealizedPct: 0.5506,
    symbols: [
      { symbol: "BTC-USD", assetClass: "crypto", quantity: 0.45, avgCost: 37920, investedEur: 15800, currentValueEur: 24500, unrealizedPlEur: 8700, unrealizedPct: 0.5506, avgHoldingDays: 610, maturityDate: null, lots: [btcLot] },
    ],
  },
];

// ---- Watchlist --------------------------------------------------------------
export const DEMO_WATCHLIST = [
  { id: 1, symbol: "BVB:H2O", assetClass: "ro_stock", label: "Hidroelectrica", sortOrder: 0 },
  { id: 2, symbol: "NVDA", assetClass: "us_stock", label: null, sortOrder: 1 },
  { id: 3, symbol: "SPY", assetClass: "us_stock", label: null, sortOrder: 2 },
  { id: 4, symbol: "ETH-USD", assetClass: "crypto", label: "Ethereum", sortOrder: 3 },
];

export const DEMO_ALERTS = [
  { id: 1, symbol: "NVDA", assetClass: "us_stock", targetPrice: 950, currency: "USD", direction: "above", active: false, triggeredAt: "2026-06-28T09:12:00.000Z", triggeredPrice: 955.2, acknowledgedAt: null, note: "Breakout watch" },
  { id: 2, symbol: "ETH-USD", assetClass: "crypto", targetPrice: 2800, currency: "USD", direction: "below", active: true, triggeredAt: null, triggeredPrice: null, acknowledgedAt: null, note: null },
];

// ---- Accounts -----------------------------------------------------------
export const DEMO_ACCOUNTS = [
  { id: 1, name: "Revolut", type: "cash", balance: 18500, currency: "EUR", isCompany: false, balanceEur: 18500 },
  { id: 2, name: "Chase Checking", type: "cash", balance: 6200, currency: "USD", isCompany: false, balanceEur: 5700 },
];

// ---- Net worth model (mirrors src/lib/aggregate.ts's NetWorthModel) --------
export const DEMO_NET_WORTH = {
  totalNetWorthEur: 314100,
  personalNetWorthEur: 314100,
  companyCashEur: 0,
  totalInvestedEur: 62500,
  totalCurrentValueEur: 82900,
  unrealizedPlEur: 20400,
  unrealizedPct: 0.3264,
  realizedPlYtdEur: 1800,
  components: {
    investmentsEur: 82900,
    accountsEur: 24200,
    loansEur: 12000,
    propertiesEur: 195000,
    businessesEur: 0,
  },
  allocationByClass: [
    { key: "ro_stock", label: "RO Stocks", valueEur: 34100 },
    { key: "us_stock", label: "US Stocks", valueEur: 24300 },
    { key: "crypto", label: "Crypto", valueEur: 24500 },
    { key: "property", label: "Real Estate", valueEur: 195000 },
    { key: "loans", label: "Loans", valueEur: 12000 },
    { key: "cash", label: "Cash", valueEur: 24200 },
  ],
  allocationByGeography: [
    { key: "Romania", valueEur: 241100 },
    { key: "US", valueEur: 24300 },
    { key: "Crypto", valueEur: 24500 },
    { key: "Global", valueEur: 24200 },
  ],
  currencyExposure: [
    { currency: "EUR", valueEur: 225500 },
    { currency: "USD", valueEur: 88600 },
  ],
  concentration: {
    largestSymbol: "BTC-USD",
    largestPct: 0.078,
    romanianPct: 0.7676,
    illiquidPct: 0.6590,
  },
};

// ---- Net worth history (Overview trend chart) -------------------------------
export const DEMO_NET_WORTH_HISTORY: { date: string; totalEur: number }[] = [
  { date: "2025-07-08", totalEur: 235000 },
  { date: "2025-08-08", totalEur: 241000 },
  { date: "2025-09-08", totalEur: 238000 },
  { date: "2025-10-08", totalEur: 247000 },
  { date: "2025-11-08", totalEur: 252000 },
  { date: "2025-12-08", totalEur: 261000 },
  { date: "2026-01-08", totalEur: 268000 },
  { date: "2026-02-08", totalEur: 272000 },
  { date: "2026-03-08", totalEur: 279000 },
  { date: "2026-04-08", totalEur: 288000 },
  { date: "2026-05-08", totalEur: 296000 },
  { date: "2026-06-08", totalEur: 305000 },
  { date: "2026-07-08", totalEur: 314100 },
];

// ---- Performance (mirrors src/lib/page-data.ts getPerformance) --------------
export interface DemoPerfRow {
  symbol: string;
  unrealizedPlEur: number;
  unrealizedPct: number | null;
}
export const DEMO_PERFORMANCE = {
  totalUnrealized: 20400,
  totalRealized: 1800,
  bestPct: [
    { symbol: "BTC-USD", unrealizedPlEur: 8700, unrealizedPct: 0.5506 },
    { symbol: "AAPL", unrealizedPlEur: 3400, unrealizedPct: 0.3696 },
    { symbol: "BVB:TLV", unrealizedPlEur: 4600, unrealizedPct: 0.3026 },
    { symbol: "VOO", unrealizedPlEur: 1900, unrealizedPct: 0.1939 },
    { symbol: "BVB:SNP", unrealizedPlEur: 1800, unrealizedPct: 0.144 },
  ] as DemoPerfRow[],
  worstPct: [
    { symbol: "PYPL", unrealizedPlEur: -1400, unrealizedPct: -0.1795 },
    { symbol: "BVB:EL", unrealizedPlEur: -300, unrealizedPct: -0.0612 },
    { symbol: "BVB:SNP", unrealizedPlEur: 1800, unrealizedPct: 0.144 },
    { symbol: "VOO", unrealizedPlEur: 1900, unrealizedPct: 0.1939 },
    { symbol: "BVB:TLV", unrealizedPlEur: 4600, unrealizedPct: 0.3026 },
  ] as DemoPerfRow[],
  bestAbs: [
    { symbol: "BTC-USD", unrealizedPlEur: 8700, unrealizedPct: 0.5506 },
    { symbol: "BVB:TLV", unrealizedPlEur: 4600, unrealizedPct: 0.3026 },
    { symbol: "AAPL", unrealizedPlEur: 3400, unrealizedPct: 0.3696 },
    { symbol: "VOO", unrealizedPlEur: 1900, unrealizedPct: 0.1939 },
    { symbol: "BVB:SNP", unrealizedPlEur: 1800, unrealizedPct: 0.144 },
  ] as DemoPerfRow[],
  worstAbs: [
    { symbol: "PYPL", unrealizedPlEur: -1400, unrealizedPct: -0.1795 },
    { symbol: "BVB:EL", unrealizedPlEur: -300, unrealizedPct: -0.0612 },
    { symbol: "BVB:SNP", unrealizedPlEur: 1800, unrealizedPct: 0.144 },
    { symbol: "AAPL", unrealizedPlEur: 3400, unrealizedPct: 0.3696 },
    { symbol: "VOO", unrealizedPlEur: 1900, unrealizedPct: 0.1939 },
  ] as DemoPerfRow[],
  realizedByClass: [
    { label: "ro_stock", pl: 1500, count: 2 },
    { label: "us_stock", pl: 300, count: 1 },
  ],
  realizedByYear: [
    { label: "2026", pl: 1200, count: 2 },
    { label: "2025", pl: 600, count: 1 },
  ],
};

// ---- Dividends (mirrors DividendModel) --------------------------------------
export const DEMO_DIVIDENDS: DividendModel = {
  ttmIncomeEur: 1840,
  projectedAnnualEur: 2120,
  portfolioYoc: 0.0342,
  holdings: [
    { symbol: "BVB:TLV", assetClass: "ro_stock", shares: 40000, annualEur: 1180, yieldOnCost: 0.0776, lastPay: "2026-04-28", nextPay: "2027-04-27", currency: "RON" },
    { symbol: "BVB:SNP", assetClass: "ro_stock", shares: 55000, annualEur: 540, yieldOnCost: 0.0432, lastPay: "2026-06-10", nextPay: "2027-06-09", currency: "RON" },
    { symbol: "VOO", assetClass: "us_stock", shares: 25, annualEur: 340, yieldOnCost: 0.0347, lastPay: "2026-06-27", nextPay: "2026-09-26", currency: "USD" },
    { symbol: "AAPL", assetClass: "us_stock", shares: 60, annualEur: 60, yieldOnCost: 0.0065, lastPay: "2026-05-15", nextPay: "2026-08-14", currency: "USD" },
  ],
  calendar: [
    { label: "Jan", eur: 0 },
    { label: "Feb", eur: 85 },
    { label: "Mar", eur: 90 },
    { label: "Apr", eur: 620 },
    { label: "May", eur: 95 },
    { label: "Jun", eur: 640 },
    { label: "Jul", eur: 0 },
    { label: "Aug", eur: 95 },
    { label: "Sep", eur: 175 },
    { label: "Oct", eur: 0 },
    { label: "Nov", eur: 95 },
    { label: "Dec", eur: 180 },
  ],
  ledger: [
    { id: 1, symbol: "VOO", assetClass: "us_stock", exDate: "2026-06-24", payDate: "2026-06-27", netNative: 92.4, currency: "USD", shares: 25, cashEur: 85, note: null },
    { id: 2, symbol: "BVB:SNP", assetClass: "ro_stock", exDate: "2026-06-05", payDate: "2026-06-10", netNative: 2695, currency: "RON", shares: 55000, cashEur: 540, note: "Annual dividend" },
    { id: 3, symbol: "AAPL", assetClass: "us_stock", exDate: "2026-05-12", payDate: "2026-05-15", netNative: 15.9, currency: "USD", shares: 60, cashEur: 15, note: null },
    { id: 4, symbol: "BVB:TLV", assetClass: "ro_stock", exDate: "2026-04-24", payDate: "2026-04-28", netNative: 5890, currency: "RON", shares: 40000, cashEur: 1180, note: "Annual dividend" },
    { id: 5, symbol: "VOO", assetClass: "us_stock", exDate: "2026-03-23", payDate: "2026-03-27", netNative: 89.1, currency: "USD", shares: 25, cashEur: 82, note: null },
  ],
};

// ---- Real estate (mirrors src/lib/page-data.ts getRealEstate output) --------
const reYear = (year: number, incomeEur: number, basis: number) => ({
  year,
  incomeEur,
  roi: basis > 0 ? incomeEur / basis : 0,
  entries: [] as { id: number; year: number; month: number | null; amount: number; currency: string }[],
});

export const DEMO_PROPERTIES = [
  (() => {
    const basis = 42000; // 38k purchase + 4k notary/renovation
    const years = [
      reYear(2021, 9000, basis),
      reYear(2022, 9600, basis),
      reYear(2023, 10200, basis),
      reYear(2024, 10800, basis),
      reYear(2025, 10800, basis),
      reYear(2026, 5400, basis),
    ];
    const totalRentEur = years.reduce((s, y) => s + y.incomeEur, 0); // 55800
    return {
      id: 1,
      name: "Apartment · Bucharest",
      value: 195000,
      currency: "EUR",
      monthlyRent: 900,
      valueEur: 195000,
      monthlyRentEur: 900,
      isRented: true,
      status: "owned" as const,
      purchaseDate: "2010-05-01",
      purchasePrice: 38000,
      purchaseEur: basis,
      saleDate: null,
      salePrice: null,
      saleEur: null,
      capitalGainEur: null,
      notes: "Held since 2010 — long-term rental, fully occupied.",
      acquisitions: [
        { id: 1, label: "Purchase price", eur: 38000, amount: 38000, currency: "EUR" },
        { id: 2, label: "Notary + renovation", eur: 4000, amount: 4000, currency: "EUR" },
      ],
      sales: [] as { id: number; label: string; eur: number; amount: number; currency: string }[],
      years,
      totalRentEur,
      cumulativeRoi: totalRentEur / basis,
      investmentEur: basis,
      saleProceedsEur: null,
      totalIncomeEur: totalRentEur,
      netProfitEur: totalRentEur - basis,
      totalRoi: totalRentEur / basis - 1,
    };
  })(),
  (() => {
    const basis = 40000;
    const saleEur = 78000;
    const years = [
      reYear(2019, 4200, basis),
      reYear(2020, 4200, basis),
      reYear(2021, 4800, basis),
      reYear(2022, 4800, basis),
      reYear(2023, 3600, basis),
    ];
    const totalRentEur = years.reduce((s, y) => s + y.incomeEur, 0); // 21600
    const totalIncomeEur = saleEur + totalRentEur;
    return {
      id: 2,
      name: "Studio · Cluj",
      value: 78000,
      currency: "EUR",
      monthlyRent: 0,
      valueEur: 78000,
      monthlyRentEur: 0,
      isRented: false,
      status: "sold" as const,
      purchaseDate: "2015-03-01",
      purchasePrice: 40000,
      purchaseEur: basis,
      saleDate: "2024-09-12",
      salePrice: 78000,
      saleEur,
      capitalGainEur: saleEur - basis,
      notes: null,
      acquisitions: [
        { id: 3, label: "Purchase price", eur: 40000, amount: 40000, currency: "EUR" },
      ],
      sales: [
        { id: 4, label: "Sale proceeds", eur: saleEur, amount: 78000, currency: "EUR" },
      ],
      years,
      totalRentEur,
      cumulativeRoi: totalRentEur / basis,
      investmentEur: basis,
      saleProceedsEur: saleEur,
      totalIncomeEur,
      netProfitEur: totalIncomeEur - basis,
      totalRoi: totalIncomeEur / basis - 1,
    };
  })(),
];

// ---- Loans (mirrors src/lib/page-data.ts getLoansModel + LoansClient props) -
// Active principal sums to DEMO_NET_WORTH.components.loansEur (12000 EUR).
export const DEMO_LOANS: LoanCard[] = [
  {
    id: 1,
    borrower: "Andrei P.",
    principal: 8000,
    currency: "EUR",
    backed: "personal",
    startDate: "2025-11-01",
    interestRate: 6,
    compounding: "simple",
    termMonths: 12,
    status: "active",
    notes: "Bridge loan while he closes on a car sale.",
    principalEur: 8000,
    receipts: [
      { id: 1, kind: "interest", amount: 240, currency: "EUR", receivedOn: "2026-05-01", method: "bank_transfer", bank: "Revolut" },
      { id: 2, kind: "interest", amount: 240, currency: "EUR", receivedOn: "2026-06-01", method: "bank_transfer", bank: "Revolut" },
    ],
    payments: [
      { id: 1, dueDate: "2026-07-01", amount: 240, currency: "EUR", paid: true, paidDate: "2026-07-01" },
      { id: 2, dueDate: "2026-08-01", amount: 240, currency: "EUR", paid: false, paidDate: null },
      { id: 3, dueDate: "2026-11-01", amount: 8000, currency: "EUR", paid: false, paidDate: null },
    ],
    expectedInterest: 480,
    interestEarned: 400,
    interestReceived: 480,
    principalRepaid: 0,
    principalRemaining: 8000,
    nextDue: { date: "2026-08-01", amount: 240 },
    irr: 0.062,
  },
  {
    id: 2,
    borrower: "Elena D.",
    principal: 20000,
    currency: "RON",
    backed: "property",
    startDate: "2025-03-15",
    interestRate: 8,
    compounding: "annual",
    termMonths: 24,
    status: "active",
    notes: "Secured against her apartment renovation; repaying in RON.",
    principalEur: 4000,
    receipts: [
      { id: 3, kind: "principal", amount: 5000, currency: "RON", receivedOn: "2026-03-15", method: "bank_transfer", bank: "BCR" },
      { id: 4, kind: "interest", amount: 1600, currency: "RON", receivedOn: "2026-03-15", method: "bank_transfer", bank: "BCR" },
    ],
    payments: [
      { id: 4, dueDate: "2026-09-15", amount: 5000, currency: "RON", paid: false, paidDate: null },
    ],
    expectedInterest: 3200,
    interestEarned: 2100,
    interestReceived: 1600,
    principalRepaid: 5000,
    principalRemaining: 15000,
    nextDue: { date: "2026-09-15", amount: 5000 },
    irr: 0.081,
  },
  {
    id: 3,
    borrower: "Mihai T.",
    principal: 3000,
    currency: "EUR",
    backed: "none",
    startDate: "2024-01-10",
    interestRate: 0,
    compounding: "simple",
    termMonths: 6,
    status: "repaid",
    notes: "Interest-free, repaid in full ahead of schedule.",
    principalEur: 3000,
    receipts: [
      { id: 5, kind: "principal", amount: 3000, currency: "EUR", receivedOn: "2024-06-28", method: "cash", bank: null },
    ],
    payments: [
      { id: 5, dueDate: "2024-07-10", amount: 3000, currency: "EUR", paid: true, paidDate: "2024-06-28" },
    ],
    expectedInterest: 0,
    interestEarned: 0,
    interestReceived: 0,
    principalRepaid: 3000,
    principalRemaining: 0,
    nextDue: null,
    irr: 0,
  },
];

export const DEMO_LOANS_DUE_SOON: DueSoon[] = [
  { id: 2, borrower: "Andrei P.", amount: 240, currency: "EUR", dueDate: "2026-08-01", daysUntil: 24, overdue: false },
];

// ---- Businesses (mirrors src/lib/page-data.ts getBusinessesModel) ----------
export interface DemoBusinessYear {
  year: number;
  revenueEur: number;
  cogsEur: number;
  grossProfitEur: number;
  grossMargin: number | null;
}
export interface DemoBusiness {
  id: number;
  name: string;
  currency: string;
  status: string;
  valuationEur: number | null;
  notes: string | null;
  years: DemoBusinessYear[];
  totalRevenueEur: number;
  totalCogsEur: number;
  totalGrossProfitEur: number;
  lifetimeGrossMargin: number | null;
}

const bizYear = (year: number, revenueEur: number, cogsEur: number): DemoBusinessYear => ({
  year,
  revenueEur,
  cogsEur,
  grossProfitEur: revenueEur - cogsEur,
  grossMargin: revenueEur > 0 ? (revenueEur - cogsEur) / revenueEur : null,
});

export const DEMO_BUSINESSES: DemoBusiness[] = [
  (() => {
    const years = [bizYear(2024, 82000, 49000), bizYear(2025, 96000, 55000), bizYear(2026, 51000, 29000)];
    const totalRevenueEur = years.reduce((s, y) => s + y.revenueEur, 0);
    const totalCogsEur = years.reduce((s, y) => s + y.cogsEur, 0);
    const totalGrossProfitEur = totalRevenueEur - totalCogsEur;
    return {
      id: 1,
      name: "NomadShop (e-commerce)",
      currency: "EUR",
      status: "active",
      valuationEur: 45000,
      notes: "Dropshipping storefront, run solo alongside the day job.",
      years,
      totalRevenueEur,
      totalCogsEur,
      totalGrossProfitEur,
      lifetimeGrossMargin: totalRevenueEur > 0 ? totalGrossProfitEur / totalRevenueEur : null,
    };
  })(),
  (() => {
    const years = [bizYear(2020, 61000, 8000), bizYear(2021, 74000, 9000), bizYear(2022, 39000, 5000)];
    const totalRevenueEur = years.reduce((s, y) => s + y.revenueEur, 0);
    const totalCogsEur = years.reduce((s, y) => s + y.cogsEur, 0);
    const totalGrossProfitEur = totalRevenueEur - totalCogsEur;
    return {
      id: 2,
      name: "CodeCraft Consulting",
      currency: "USD",
      status: "closed",
      valuationEur: null,
      notes: "Freelance dev shop, wound down after moving to full-time investing.",
      years,
      totalRevenueEur,
      totalCogsEur,
      totalGrossProfitEur,
      lifetimeGrossMargin: totalRevenueEur > 0 ? totalGrossProfitEur / totalRevenueEur : null,
    };
  })(),
];

// ---- Clients (freelance / consulting revenue — mirrors ClientsModel) --------
export const DEMO_CLIENTS: ClientsModel = {
  clients: [
    {
      id: 1,
      name: "Acme Studio",
      status: "active",
      currency: "EUR",
      notes: "Design retainer, renews yearly.",
      services: [
        { id: 1, type: "retainer", label: "Monthly retainer", amount: 2000, currency: "EUR", cadence: "monthly", timesPerYear: 12, hours: null, rate: null, startDate: "2025-02-01", renewalDate: "2026-08-01", active: true, notes: null, monthlyEur: 2000, oneOffEur: 0 },
      ],
      mrrEur: 2000,
      arrEur: 24000,
      oneOffEur: 0,
    },
    {
      id: 2,
      name: "Blue Harbor Ltd",
      status: "active",
      currency: "USD",
      notes: null,
      services: [
        { id: 2, type: "project", label: "Website rebuild", amount: 6000, currency: "USD", cadence: "one_off", timesPerYear: null, hours: null, rate: null, startDate: "2026-05-10", renewalDate: null, active: true, notes: "Delivered", monthlyEur: 0, oneOffEur: 5550 },
        { id: 3, type: "support", label: "Care plan", amount: 400, currency: "USD", cadence: "monthly", timesPerYear: 12, hours: null, rate: null, startDate: "2026-06-01", renewalDate: "2027-06-01", active: true, notes: null, monthlyEur: 370, oneOffEur: 0 },
      ],
      mrrEur: 370,
      arrEur: 4440,
      oneOffEur: 5550,
    },
    {
      id: 3,
      name: "Nomad Collective",
      status: "active",
      currency: "EUR",
      notes: null,
      services: [
        { id: 4, type: "hourly", label: "Advisory", amount: 90, currency: "EUR", cadence: "hourly", timesPerYear: null, hours: 10, rate: 90, startDate: "2025-11-01", renewalDate: null, active: true, notes: "~10h/mo", monthlyEur: 900, oneOffEur: 0 },
      ],
      mrrEur: 900,
      arrEur: 10800,
      oneOffEur: 0,
    },
  ],
  totalMrrEur: 3270,
  totalArrEur: 39240,
  totalOneOffEur: 5550,
  activeCount: 3,
  renewals: [
    { clientId: 1, clientName: "Acme Studio", type: "retainer", label: "Monthly retainer", renewalDate: "2026-08-01", daysUntil: 22, amountEur: 2000 },
    { clientId: 2, clientName: "Blue Harbor Ltd", type: "support", label: "Care plan", renewalDate: "2027-06-01", daysUntil: 326, amountEur: 370 },
  ],
};
