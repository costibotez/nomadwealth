/**
 * Zod input schemas for the Server Actions in `src/app/actions.ts`.
 *
 * They live here (not in actions.ts) because a "use server" file may only
 * export async functions — keeping the schemas in a plain module makes the
 * form-input contract unit-testable. The subtle part is the `emptyToNull`
 * preprocess: HTML forms submit optional numeric fields as "", which must
 * become NULL in the DB, not 0.
 *
 * Note on auth: every action in actions.ts calls requireSession() before
 * parsing, EXCEPT checkAlerts — the price-refresh cron imports that one
 * directly without a session; its HTTP surface is still gated by middleware.
 */
import { z } from "zod";

export const ASSET_CLASSES = ["ro_stock", "us_stock", "crypto", "reit", "mutual_fund", "gold", "other"] as const;

/** "" / null / undefined → null; anything else runs through the inner schema. */
const emptyToNull = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), inner.nullable().default(null));

// ---- Transactions --------------------------------------------------------
export const txnSchema = z.object({
  tradeDate: z.string().min(1, "Date is required"),
  direction: z.enum(["buy", "sell"]),
  assetClass: z.enum(ASSET_CLASSES),
  symbol: z.string().min(1, "Symbol is required").max(64),
  quantity: z.coerce.number().finite(),
  unitCost: z.coerce.number().min(0),
  costCurrency: z.string().min(2).max(4).default("USD"),
  currentPrice: z.coerce.number().min(0),
  priceCurrency: z.string().min(2).max(4).default("USD"),
  commission: emptyToNull(z.coerce.number().min(0)),
  saleTax: emptyToNull(z.coerce.number().min(0)),
  maturityDate: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const priceUpdateSchema = z.array(
  z.object({
    symbol: z.string(),
    assetClass: z.string(),
    currentPrice: z.coerce.number().min(0),
  }),
);

// ---- Loans ---------------------------------------------------------------
export const loanSchema = z.object({
  borrower: z.string().min(1).max(120),
  principal: z.coerce.number().min(0),
  currency: z.string().min(2).max(4).default("EUR"),
  backed: z.enum(["property", "business", "personal", "none"]),
  startDate: z.string().optional().nullable(),
  interestRate: z.coerce.number().min(0).max(1000),
  compounding: z.enum(["simple", "monthly", "annual"]),
  termMonths: z.coerce.number().int().min(0).optional().nullable(),
  status: z.enum(["active", "repaid", "defaulted"]),
  notes: z.string().max(500).optional().nullable(),
});

export const loanPaymentSchema = z.object({
  loanId: z.coerce.number().int().positive(),
  dueDate: z.string().min(1, "Due date is required"),
  amount: z.coerce.number().min(0),
  currency: z.string().min(2).max(4),
});

export const receiptSchema = z.object({
  loanId: z.coerce.number().int().positive(),
  kind: z.enum(["principal", "interest"]),
  amount: z.coerce.number().min(0),
  currency: z.string().min(2).max(4),
  receivedOn: z.string().min(1, "Date is required"),
  method: z.enum(["cash", "bank_transfer"]),
  bank: z.string().max(80).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

// ---- Dividends -----------------------------------------------------------
export const dividendSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(64),
  assetClass: z.enum(ASSET_CLASSES),
  exDate: z.string().optional().nullable(),
  payDate: z.string().min(1, "Pay date is required"),
  // Net (after-tax) cash actually received, in `currency`. This is the value the
  // form now collects. amountPerShare stays optional for legacy/back-compat.
  netAmount: z.coerce.number().min(0),
  amountPerShare: z.coerce.number().min(0).optional().default(0),
  currency: z.string().min(2).max(4),
  note: z.string().max(300).optional().nullable(),
});

// ---- Accounts ------------------------------------------------------------
export const accountSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["crypto", "personal_cash", "company_cash", "savings", "brokerage"]),
  balance: z.coerce.number(),
  currency: z.string().min(2).max(4),
  isCompany: z.coerce.boolean().default(false),
  notes: z.string().max(500).optional().nullable(),
});

// ---- Properties ----------------------------------------------------------
export const propertySchema = z.object({
  name: z.string().min(1).max(120),
  value: z.coerce.number().min(0),
  currency: z.string().min(2).max(4),
  monthlyRent: z.coerce.number().min(0),
  isRented: z.coerce.boolean().default(false),
  status: z.enum(["active", "sold"]).default("active"),
  purchaseDate: z.string().optional().nullable(),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  saleDate: z.string().optional().nullable(),
  salePrice: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const rentSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(1990).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional().nullable(),
  amount: z.coerce.number().min(0),
  currency: z.string().min(2).max(4),
});

export const ledgerSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  kind: z.enum(["acquisition", "sale"]),
  label: z.string().min(1).max(120),
  amount: z.coerce.number().min(0),
  currency: z.string().min(2).max(4),
  occurredOn: z.string().optional().nullable(),
});

// ---- Wedding budget ------------------------------------------------------
export const weddingSchema = z.object({
  label: z.string().min(1).max(120),
  paid: z.coerce.number().min(0),
  remaining: z.coerce.number().min(0),
  currency: z.string().min(2).max(4).default("RON"),
});

export const giftSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(40),
  amount: z.coerce.number().min(0),
  currency: z.string().min(2).max(4).default("RON"),
});

// ---- Income legend -------------------------------------------------------
export const legendSchema = z.object({
  label: z.string().min(1).max(160),
  category: z.string().min(1).max(40),
  customLabel: z.string().max(120).optional().nullable(),
});

// ---- Watchlist / price alerts --------------------------------------------
export const watchlistSchema = z.object({
  symbol: z.string().min(1).max(64),
  assetClass: z.enum(ASSET_CLASSES),
  label: z.string().max(120).optional().nullable(),
});

export const alertSchema = z.object({
  symbol: z.string().min(1).max(64),
  assetClass: z.enum(ASSET_CLASSES),
  targetPrice: z.coerce.number().positive(),
  currency: z.string().min(2).max(4).default("USD"),
  direction: z.enum(["above", "below"]),
  note: z.string().max(200).optional().nullable(),
});

// ---- Businesses ----------------------------------------------------------
export const businessSchema = z.object({
  name: z.string().min(1).max(120),
  currency: z.string().min(2).max(4).default("EUR"),
  status: z.enum(["active", "sold", "closed"]).default("active"),
  valuation: emptyToNull(z.coerce.number().min(0)),
  startedOn: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const businessLedgerSchema = z.object({
  businessId: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(1990).max(2100),
  month: emptyToNull(z.coerce.number().int().min(1).max(12)),
  kind: z.enum(["revenue", "cogs", "ad_spend", "expense"]),
  amount: z.coerce.number().min(0),
  currency: z.string().min(2).max(4),
  label: z.string().max(120).optional().nullable(),
});

// ---- Clients -------------------------------------------------------------
export const clientSchema = z.object({
  name: z.string().min(1).max(120),
  status: z.enum(["active", "paused", "churned"]).default("active"),
  currency: z.string().min(2).max(4).default("EUR"),
  notes: z.string().max(500).optional().nullable(),
});

export const clientServiceSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  type: z.enum(["monthly_retainer", "one_off", "annual_hosting", "marketing", "reporting", "hourly", "other"]),
  label: z.string().max(160).optional().nullable(),
  amount: z.coerce.number().min(0).default(0),
  currency: z.string().min(2).max(4),
  cadence: z.enum(["weekly", "monthly", "quarterly", "four_monthly", "annual", "one_off", "times_per_year"]),
  timesPerYear: emptyToNull(z.coerce.number().int().min(1).max(366)),
  hours: emptyToNull(z.coerce.number().min(0)),
  rate: emptyToNull(z.coerce.number().min(0)),
  startDate: z.string().optional().nullable(),
  renewalDate: z.string().optional().nullable(),
  active: z.coerce.boolean().default(true),
});
