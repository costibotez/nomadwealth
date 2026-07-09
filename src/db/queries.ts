/**
 * Centralised read layer. Every aggregation/page reads through these helpers so
 * the soft-delete filter (`deleted_at IS NULL`) can never be forgotten per-page.
 * Numeric columns (returned as strings by the driver) are parsed to numbers here.
 */
import "server-only";
import { and, isNull, isNotNull, eq, desc, asc, gte, lte } from "drizzle-orm";
import { db } from "./index";
import {
  accounts,
  transactions,
  loans,
  loanPayments,
  loanReceipts,
  properties,
  propertyIncome,
  propertyRent,
  propertyLedger,
  cashflowIncome,
  cashflowExpense,
  realizedTrades,
  weddingItems,
  weddingGifts,
  incomeLegend,
  watchlist,
  priceAlerts,
  netWorthSnapshots,
  dividends,
  businesses,
  businessLedger,
  clients,
  clientServices,
} from "./schema";

const num = (v: string | null | undefined): number =>
  v === null || v === undefined ? 0 : Number(v);

// ---- Domain shapes (numbers, not strings) --------------------------------
export interface AccountRow {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  isCompany: boolean;
  notes: string | null;
}
export interface TransactionRow {
  id: number;
  tradeDate: string;
  direction: string;
  assetClass: string;
  symbol: string;
  quantity: number;
  unitCost: number;
  costCurrency: string;
  currentPrice: number;
  priceCurrency: string;
  commission: number | null;
  saleTax: number | null;
  maturityDate: string | null;
  notes: string | null;
}
export interface LoanRow {
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
export interface LoanPaymentRow {
  id: number;
  loanId: number;
  dueDate: string;
  amount: number;
  currency: string;
  paid: boolean;
  paidDate: string | null;
}
export interface LoanReceiptRow {
  id: number;
  loanId: number;
  kind: string;
  amount: number;
  currency: string;
  receivedOn: string;
  method: string;
  bank: string | null;
  notes: string | null;
}

export async function getLoanReceipts(loanId?: number): Promise<LoanReceiptRow[]> {
  const where = loanId
    ? and(isNull(loanReceipts.deletedAt), eq(loanReceipts.loanId, loanId))
    : isNull(loanReceipts.deletedAt);
  const rows = await db.select().from(loanReceipts).where(where).orderBy(loanReceipts.receivedOn);
  return rows.map((r) => ({
    id: r.id,
    loanId: r.loanId,
    kind: r.kind,
    amount: num(r.amount),
    currency: r.currency,
    receivedOn: r.receivedOn,
    method: r.method,
    bank: r.bank,
    notes: r.notes,
  }));
}

export interface PropertyRow {
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
export interface PropertyRentRow {
  id: number;
  propertyId: number;
  year: number;
  month: number | null;
  amount: number;
  currency: string;
}
export interface PropertyIncomeRow {
  id: number;
  propertyId: number;
  year: number;
  income: number;
  roi: number;
}
export interface CashflowRow {
  id: number;
  month: number;
  year: number;
  label: string;
  amount: number;
  currency: string;
  amountEur: number;
  category: string | null;
}

// ---- Reads (active rows) -------------------------------------------------
export async function getAccounts(): Promise<AccountRow[]> {
  const rows = await db.select().from(accounts).where(isNull(accounts.deletedAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    balance: num(r.balance),
    currency: r.currency,
    isCompany: r.isCompany,
    notes: r.notes,
  }));
}

export async function getTransactions(): Promise<TransactionRow[]> {
  const rows = await db
    .select()
    .from(transactions)
    .where(isNull(transactions.deletedAt))
    .orderBy(desc(transactions.tradeDate));
  return rows.map((r) => ({
    id: r.id,
    tradeDate: r.tradeDate,
    direction: r.direction,
    assetClass: r.assetClass,
    symbol: r.symbol,
    quantity: num(r.quantity),
    unitCost: num(r.unitCost),
    costCurrency: r.costCurrency,
    currentPrice: num(r.currentPrice),
    priceCurrency: r.priceCurrency,
    commission: r.commission == null ? null : num(r.commission),
    saleTax: r.saleTax == null ? null : num(r.saleTax),
    maturityDate: r.maturityDate,
    notes: r.notes,
  }));
}

export async function getLoans(): Promise<LoanRow[]> {
  const rows = await db.select().from(loans).where(isNull(loans.deletedAt));
  return rows.map((r) => ({
    id: r.id,
    borrower: r.borrower,
    principal: num(r.principal),
    currency: r.currency,
    backed: r.backed,
    startDate: r.startDate,
    interestRate: num(r.interestRate),
    compounding: r.compounding,
    termMonths: r.termMonths,
    status: r.status,
    notes: r.notes,
  }));
}

export async function getLoanPayments(loanId?: number): Promise<LoanPaymentRow[]> {
  const where = loanId
    ? and(isNull(loanPayments.deletedAt), eq(loanPayments.loanId, loanId))
    : isNull(loanPayments.deletedAt);
  const rows = await db
    .select()
    .from(loanPayments)
    .where(where)
    .orderBy(loanPayments.dueDate);
  return rows.map((r) => ({
    id: r.id,
    loanId: r.loanId,
    dueDate: r.dueDate,
    amount: num(r.amount),
    currency: r.currency,
    paid: r.paid,
    paidDate: r.paidDate,
  }));
}

export interface UpcomingLoanPaymentRow extends LoanPaymentRow {
  borrower: string;
  daysUntil: number; // negative = overdue
  overdue: boolean;
}

/**
 * Unpaid loan payments that are overdue or due within `withinDays`, joined to the
 * borrower name and sorted by due date (most urgent first). Powers the "due soon"
 * strip on the Loans page and the bell badge.
 */
export async function getUpcomingLoanPayments(withinDays = 14): Promise<UpcomingLoanPaymentRow[]> {
  const horizon = new Date(Date.now() + withinDays * 86_400_000).toISOString().slice(0, 10);
  const rows = await db
    .select({
      id: loanPayments.id,
      loanId: loanPayments.loanId,
      dueDate: loanPayments.dueDate,
      amount: loanPayments.amount,
      currency: loanPayments.currency,
      paid: loanPayments.paid,
      paidDate: loanPayments.paidDate,
      borrower: loans.borrower,
    })
    .from(loanPayments)
    .innerJoin(loans, eq(loanPayments.loanId, loans.id))
    .where(
      and(
        isNull(loanPayments.deletedAt),
        eq(loanPayments.paid, false),
        isNull(loans.deletedAt),
        lte(loanPayments.dueDate, horizon),
      ),
    )
    .orderBy(asc(loanPayments.dueDate));
  const today = new Date().toISOString().slice(0, 10);
  return rows.map((r) => {
    const daysUntil = Math.round(
      (new Date(r.dueDate).getTime() - new Date(today).getTime()) / 86_400_000,
    );
    return {
      id: r.id,
      loanId: r.loanId,
      dueDate: r.dueDate,
      amount: num(r.amount),
      currency: r.currency,
      paid: r.paid,
      paidDate: r.paidDate,
      borrower: r.borrower,
      daysUntil,
      overdue: daysUntil < 0,
    };
  });
}

export async function getProperties(): Promise<PropertyRow[]> {
  const rows = await db.select().from(properties).where(isNull(properties.deletedAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    value: num(r.value),
    currency: r.currency,
    monthlyRent: num(r.monthlyRent),
    isRented: r.isRented,
    status: r.status,
    purchaseDate: r.purchaseDate,
    purchasePrice: r.purchasePrice === null ? null : num(r.purchasePrice),
    saleDate: r.saleDate,
    salePrice: r.salePrice === null ? null : num(r.salePrice),
    notes: r.notes,
  }));
}

export interface PropertyLedgerRow {
  id: number;
  propertyId: number;
  kind: string;
  label: string;
  amount: number;
  currency: string;
  occurredOn: string | null;
  notes: string | null;
}

export async function getPropertyLedger(): Promise<PropertyLedgerRow[]> {
  const rows = await db
    .select()
    .from(propertyLedger)
    .where(isNull(propertyLedger.deletedAt))
    .orderBy(propertyLedger.id);
  return rows.map((r) => ({
    id: r.id,
    propertyId: r.propertyId,
    kind: r.kind,
    label: r.label,
    amount: num(r.amount),
    currency: r.currency,
    occurredOn: r.occurredOn,
    notes: r.notes,
  }));
}

export async function getPropertyRent(): Promise<PropertyRentRow[]> {
  const rows = await db
    .select()
    .from(propertyRent)
    .where(isNull(propertyRent.deletedAt))
    .orderBy(propertyRent.year, propertyRent.month);
  return rows.map((r) => ({
    id: r.id,
    propertyId: r.propertyId,
    year: r.year,
    month: r.month,
    amount: num(r.amount),
    currency: r.currency,
  }));
}

export async function getPropertyIncome(): Promise<PropertyIncomeRow[]> {
  const rows = await db
    .select()
    .from(propertyIncome)
    .where(isNull(propertyIncome.deletedAt))
    .orderBy(propertyIncome.year);
  return rows.map((r) => ({
    id: r.id,
    propertyId: r.propertyId,
    year: r.year,
    income: num(r.income),
    roi: num(r.roi),
  }));
}

export async function getCashflowIncome(): Promise<CashflowRow[]> {
  const rows = await db
    .select()
    .from(cashflowIncome)
    .where(isNull(cashflowIncome.deletedAt));
  return rows.map(mapCashflow);
}

export async function getCashflowExpense(): Promise<CashflowRow[]> {
  const rows = await db
    .select()
    .from(cashflowExpense)
    .where(isNull(cashflowExpense.deletedAt));
  return rows.map(mapCashflow);
}

function mapCashflow(r: {
  id: number;
  month: number;
  year: number;
  label: string;
  amount: string;
  currency: string;
  amountEur: string;
  category: string | null;
}): CashflowRow {
  return {
    id: r.id,
    month: r.month,
    year: r.year,
    label: r.label,
    amount: num(r.amount),
    currency: r.currency,
    amountEur: num(r.amountEur),
    category: r.category,
  };
}

export interface RealizedTradeRow {
  id: number;
  assetClass: string;
  symbol: string;
  openDate: string | null;
  closeDate: string | null;
  quantity: number;
  cost: number;
  proceeds: number;
  pl: number;
  currency: string;
}

export async function getRealizedTrades(): Promise<RealizedTradeRow[]> {
  const rows = await db
    .select()
    .from(realizedTrades)
    .where(isNull(realizedTrades.deletedAt))
    .orderBy(desc(realizedTrades.closeDate));
  return rows.map((r) => ({
    id: r.id,
    assetClass: r.assetClass,
    symbol: r.symbol,
    openDate: r.openDate,
    closeDate: r.closeDate,
    quantity: num(r.quantity),
    cost: num(r.cost),
    proceeds: num(r.proceeds),
    pl: num(r.pl),
    currency: r.currency,
  }));
}

export interface WeddingItemRow {
  id: number;
  label: string;
  paid: number;
  remaining: number;
  currency: string;
}

export async function getWeddingItems(): Promise<WeddingItemRow[]> {
  const rows = await db
    .select()
    .from(weddingItems)
    .where(isNull(weddingItems.deletedAt))
    .orderBy(weddingItems.id);
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    paid: num(r.paid),
    remaining: num(r.remaining),
    currency: r.currency,
  }));
}

export interface WeddingGiftRow {
  id: number;
  name: string;
  type: string;
  amount: number;
  currency: string;
}

export async function getWeddingGifts(): Promise<WeddingGiftRow[]> {
  const rows = await db
    .select()
    .from(weddingGifts)
    .where(isNull(weddingGifts.deletedAt))
    .orderBy(weddingGifts.id);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    amount: num(r.amount),
    currency: r.currency,
  }));
}

export interface IncomeLegendRow {
  id: number;
  label: string;
  category: string;
  customLabel: string | null;
}

export async function getIncomeLegend(): Promise<IncomeLegendRow[]> {
  const rows = await db
    .select()
    .from(incomeLegend)
    .where(isNull(incomeLegend.deletedAt));
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    category: r.category,
    customLabel: r.customLabel,
  }));
}

export interface WatchlistRow {
  id: number;
  symbol: string;
  assetClass: string;
  label: string | null;
  sortOrder: number;
}

export async function getWatchlist(): Promise<WatchlistRow[]> {
  const rows = await db
    .select()
    .from(watchlist)
    .where(isNull(watchlist.deletedAt))
    .orderBy(watchlist.sortOrder, watchlist.id);
  return rows.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    assetClass: r.assetClass,
    label: r.label,
    sortOrder: r.sortOrder,
  }));
}

export interface PriceAlertRow {
  id: number;
  symbol: string;
  assetClass: string;
  targetPrice: number;
  currency: string;
  direction: string;
  active: boolean;
  triggeredAt: string | null;
  triggeredPrice: number | null;
  acknowledgedAt: string | null;
  note: string | null;
}

function mapAlert(r: typeof priceAlerts.$inferSelect): PriceAlertRow {
  return {
    id: r.id,
    symbol: r.symbol,
    assetClass: r.assetClass,
    targetPrice: num(r.targetPrice),
    currency: r.currency,
    direction: r.direction,
    active: r.active,
    triggeredAt: r.triggeredAt ? r.triggeredAt.toISOString() : null,
    triggeredPrice: r.triggeredPrice === null ? null : num(r.triggeredPrice),
    acknowledgedAt: r.acknowledgedAt ? r.acknowledgedAt.toISOString() : null,
    note: r.note,
  };
}

export async function getPriceAlerts(): Promise<PriceAlertRow[]> {
  const rows = await db.select().from(priceAlerts).where(isNull(priceAlerts.deletedAt)).orderBy(priceAlerts.id);
  return rows.map(mapAlert);
}

/** Triggered but not yet acknowledged — drives the bell badge. */
export async function getUnacknowledgedAlerts(): Promise<PriceAlertRow[]> {
  const rows = await db
    .select()
    .from(priceAlerts)
    .where(and(isNull(priceAlerts.deletedAt), isNotNull(priceAlerts.triggeredAt), isNull(priceAlerts.acknowledgedAt)));
  return rows.map(mapAlert);
}

// ---- Trash (soft-deleted rows) -------------------------------------------
export async function getTrash() {
  const [txns, lns, pmts, accs, props] = await Promise.all([
    db.select().from(transactions).where(isNotNull(transactions.deletedAt)),
    db.select().from(loans).where(isNotNull(loans.deletedAt)),
    db.select().from(loanPayments).where(isNotNull(loanPayments.deletedAt)),
    db.select().from(accounts).where(isNotNull(accounts.deletedAt)),
    db.select().from(properties).where(isNotNull(properties.deletedAt)),
  ]);
  return { transactions: txns, loans: lns, loanPayments: pmts, accounts: accs, properties: props };
}

// ---- Dividends -----------------------------------------------------------
export interface DividendRow {
  id: number;
  symbol: string;
  assetClass: string;
  exDate: string | null;
  payDate: string;
  /** After-tax cash received (native currency). Null on legacy per-share rows. */
  netAmount: number | null;
  amountPerShare: number;
  currency: string;
  note: string | null;
}

export async function getDividends(): Promise<DividendRow[]> {
  const rows = await db
    .select()
    .from(dividends)
    .where(isNull(dividends.deletedAt))
    .orderBy(desc(dividends.payDate));
  return rows.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    assetClass: r.assetClass,
    exDate: r.exDate,
    payDate: r.payDate,
    netAmount: r.netAmount == null ? null : num(r.netAmount),
    amountPerShare: num(r.amountPerShare),
    currency: r.currency,
    note: r.note,
  }));
}

// ---- Businesses ----------------------------------------------------------
export interface BusinessRow {
  id: number;
  name: string;
  currency: string;
  status: string;
  valuation: number | null;
  startedOn: string | null;
  notes: string | null;
}
export interface BusinessLedgerRow {
  id: number;
  businessId: number;
  year: number;
  month: number | null;
  kind: string;
  amount: number;
  currency: string;
  label: string | null;
  notes: string | null;
}

export async function getBusinesses(): Promise<BusinessRow[]> {
  const rows = await db.select().from(businesses).where(isNull(businesses.deletedAt)).orderBy(businesses.id);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    currency: r.currency,
    status: r.status,
    valuation: r.valuation === null ? null : num(r.valuation),
    startedOn: r.startedOn,
    notes: r.notes,
  }));
}

export async function getBusinessLedger(): Promise<BusinessLedgerRow[]> {
  const rows = await db
    .select()
    .from(businessLedger)
    .where(isNull(businessLedger.deletedAt))
    .orderBy(businessLedger.year, businessLedger.month);
  return rows.map((r) => ({
    id: r.id,
    businessId: r.businessId,
    year: r.year,
    month: r.month,
    kind: r.kind,
    amount: num(r.amount),
    currency: r.currency,
    label: r.label,
    notes: r.notes,
  }));
}

// ---- Clients -------------------------------------------------------------
export interface ClientRow {
  id: number;
  name: string;
  status: string;
  currency: string;
  notes: string | null;
}
export interface ClientServiceRow {
  id: number;
  clientId: number;
  type: string;
  label: string | null;
  amount: number;
  currency: string;
  cadence: string;
  timesPerYear: number | null;
  hours: number | null;
  rate: number | null;
  startDate: string | null;
  renewalDate: string | null;
  active: boolean;
  notes: string | null;
}

export async function getClients(): Promise<ClientRow[]> {
  const rows = await db.select().from(clients).where(isNull(clients.deletedAt)).orderBy(clients.id);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    currency: r.currency,
    notes: r.notes,
  }));
}

export async function getClientServices(): Promise<ClientServiceRow[]> {
  const rows = await db
    .select()
    .from(clientServices)
    .where(isNull(clientServices.deletedAt))
    .orderBy(clientServices.id);
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    type: r.type,
    label: r.label,
    amount: num(r.amount),
    currency: r.currency,
    cadence: r.cadence,
    timesPerYear: r.timesPerYear,
    hours: r.hours === null ? null : num(r.hours),
    rate: r.rate === null ? null : num(r.rate),
    startDate: r.startDate,
    renewalDate: r.renewalDate,
    active: r.active,
    notes: r.notes,
  }));
}

// ---- Net-worth snapshots -------------------------------------------------
export interface NetWorthSnapshotRow {
  snapshotDate: string; // YYYY-MM-DD
  totalEur: number;
  personalEur: number;
  investmentsEur: number;
  accountsEur: number;
  loansEur: number;
  propertiesEur: number;
  businessesEur: number;
}

/**
 * Insert (or update, if one already exists for that date) a daily net-worth
 * snapshot. Called by the price-refresh cron so history accrues automatically.
 */
export async function upsertNetWorthSnapshot(s: NetWorthSnapshotRow): Promise<void> {
  await db
    .insert(netWorthSnapshots)
    .values({
      snapshotDate: s.snapshotDate,
      totalEur: String(s.totalEur),
      personalEur: String(s.personalEur),
      investmentsEur: String(s.investmentsEur),
      accountsEur: String(s.accountsEur),
      loansEur: String(s.loansEur),
      propertiesEur: String(s.propertiesEur),
      businessesEur: String(s.businessesEur),
    })
    .onConflictDoUpdate({
      target: netWorthSnapshots.snapshotDate,
      set: {
        totalEur: String(s.totalEur),
        personalEur: String(s.personalEur),
        investmentsEur: String(s.investmentsEur),
        accountsEur: String(s.accountsEur),
        loansEur: String(s.loansEur),
        propertiesEur: String(s.propertiesEur),
        businessesEur: String(s.businessesEur),
        updatedAt: new Date(),
      },
    });
}

/** Daily net-worth history, oldest first. `sinceDays` limits the window. */
export async function getNetWorthHistory(sinceDays?: number): Promise<NetWorthSnapshotRow[]> {
  const base = db.select().from(netWorthSnapshots);
  const rows = sinceDays
    ? await base
        .where(
          gte(
            netWorthSnapshots.snapshotDate,
            new Date(Date.now() - sinceDays * 86_400_000).toISOString().slice(0, 10),
          ),
        )
        .orderBy(asc(netWorthSnapshots.snapshotDate))
    : await base.orderBy(asc(netWorthSnapshots.snapshotDate));
  return rows.map((r) => ({
    snapshotDate: r.snapshotDate,
    totalEur: num(r.totalEur),
    personalEur: num(r.personalEur),
    investmentsEur: num(r.investmentsEur),
    accountsEur: num(r.accountsEur),
    loansEur: num(r.loansEur),
    propertiesEur: num(r.propertiesEur),
    businessesEur: num(r.businessesEur),
  }));
}
