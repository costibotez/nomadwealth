/**
 * Canonical data model. Neon (Postgres) is the single source of truth.
 *
 * Conventions:
 *  - money & quantities are `numeric` (never float) — Drizzle returns them as
 *    strings; the query layer (src/db/queries.ts) parses to numbers.
 *  - every table has created_at / updated_at and a nullable deleted_at for
 *    soft delete. Reads filter `deleted_at IS NULL` (see queries.ts).
 */
import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  pgEnum,
  date,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

// ---- Enums ---------------------------------------------------------------
export const accountTypeEnum = pgEnum("account_type", [
  "crypto",
  "personal_cash",
  "company_cash",
  "savings",
  "brokerage",
]);

export const directionEnum = pgEnum("direction", ["buy", "sell"]);

export const assetClassEnum = pgEnum("asset_class", [
  "ro_stock",
  "us_stock",
  "crypto",
  "reit",
  "mutual_fund",
  "gold",
  "other",
]);

export const loanBackedEnum = pgEnum("loan_backed", [
  "property",
  "business",
  "personal",
  "none",
]);

export const compoundingEnum = pgEnum("compounding", [
  "simple",
  "monthly",
  "annual",
]);

export const loanStatusEnum = pgEnum("loan_status", [
  "active",
  "repaid",
  "defaulted",
]);

export const alertDirectionEnum = pgEnum("alert_direction", ["above", "below"]);

export const receiptKindEnum = pgEnum("receipt_kind", ["principal", "interest"]);
export const receiptMethodEnum = pgEnum("receipt_method", ["cash", "bank_transfer"]);

export const cashflowKindEnum = pgEnum("cashflow_kind", ["income", "expense"]);

export const propertyStatusEnum = pgEnum("property_status", ["active", "sold"]);
export const propertyLedgerKindEnum = pgEnum("property_ledger_kind", ["acquisition", "sale"]);

export const businessStatusEnum = pgEnum("business_status", ["active", "sold", "closed"]);
export const businessLedgerKindEnum = pgEnum("business_ledger_kind", [
  "revenue",
  "cogs",
  "ad_spend",
  "expense",
]);

export const clientStatusEnum = pgEnum("client_status", ["active", "paused", "churned"]);
export const serviceTypeEnum = pgEnum("service_type", [
  "monthly_retainer",
  "one_off",
  "annual_hosting",
  "marketing",
  "reporting",
  "hourly",
  "other",
]);
export const serviceCadenceEnum = pgEnum("service_cadence", [
  "weekly",
  "monthly",
  "quarterly",
  "four_monthly",
  "annual",
  "one_off",
  "times_per_year",
]);

// Shared timestamp columns
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

const MONEY = { precision: 20, scale: 6 } as const;
const QTY = { precision: 30, scale: 12 } as const;

// ---- Accounts ------------------------------------------------------------
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  balance: numeric("balance", MONEY).notNull().default("0"),
  currency: text("currency").notNull().default("EUR"),
  isCompany: boolean("is_company").notNull().default(false),
  notes: text("notes"),
  ...timestamps,
});

// ---- Transactions (investment lots) -------------------------------------
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  tradeDate: date("trade_date").notNull(),
  direction: directionEnum("direction").notNull().default("buy"),
  assetClass: assetClassEnum("asset_class").notNull(),
  symbol: text("symbol").notNull(),
  quantity: numeric("quantity", QTY).notNull(),
  unitCost: numeric("unit_cost", MONEY).notNull().default("0"),
  costCurrency: text("cost_currency").notNull().default("USD"),
  currentPrice: numeric("current_price", MONEY).notNull().default("0"),
  priceCurrency: text("price_currency").notNull().default("USD"),
  // Optional broker commission (buy or sell) and sale tax (sell only), in the
  // cost currency. Null = not recorded. Folded into cost basis / proceeds.
  commission: numeric("commission", MONEY),
  saleTax: numeric("sale_tax", MONEY),
  maturityDate: date("maturity_date"),
  notes: text("notes"),
  ...timestamps,
});

// ---- Loans receivable ----------------------------------------------------
export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  borrower: text("borrower").notNull(),
  principal: numeric("principal", MONEY).notNull(),
  currency: text("currency").notNull().default("EUR"),
  backed: loanBackedEnum("backed").notNull().default("none"),
  startDate: date("start_date"),
  interestRate: numeric("interest_rate", { precision: 8, scale: 4 })
    .notNull()
    .default("0"), // annual %
  compounding: compoundingEnum("compounding").notNull().default("simple"),
  termMonths: integer("term_months"),
  status: loanStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  ...timestamps,
});

export const loanPayments = pgTable("loan_payments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id")
    .notNull()
    .references(() => loans.id),
  dueDate: date("due_date").notNull(),
  amount: numeric("amount", MONEY).notNull(),
  currency: text("currency").notNull().default("EUR"),
  paid: boolean("paid").notNull().default(false),
  paidDate: date("paid_date"),
  ...timestamps,
});

// Actual money received against a loan — a ledger of lump-sum repayments
// (principal) and interest ("dobândă"), each with how + when it was received.
export const loanReceipts = pgTable("loan_receipts", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id")
    .notNull()
    .references(() => loans.id),
  kind: receiptKindEnum("kind").notNull().default("principal"),
  amount: numeric("amount", MONEY).notNull(),
  currency: text("currency").notNull().default("EUR"),
  receivedOn: date("received_on").notNull(),
  method: receiptMethodEnum("method").notNull().default("bank_transfer"),
  bank: text("bank"), // which bank, when method = bank_transfer
  notes: text("notes"),
  ...timestamps,
});

// ---- Properties ----------------------------------------------------------
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: numeric("value", MONEY).notNull(),
  currency: text("currency").notNull().default("EUR"),
  monthlyRent: numeric("monthly_rent", MONEY).notNull().default("0"),
  isRented: boolean("is_rented").notNull().default(false),
  status: propertyStatusEnum("status").notNull().default("active"),
  purchaseDate: date("purchase_date"),
  purchasePrice: numeric("purchase_price", MONEY),
  saleDate: date("sale_date"),
  salePrice: numeric("sale_price", MONEY),
  notes: text("notes"),
  ...timestamps,
});

// Per-month (or per-year lump, when month is null) rent received, in its own
// currency. Powers the yield/ROI view.
export const propertyRent = pgTable("property_rent", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id")
    .notNull()
    .references(() => properties.id),
  year: integer("year").notNull(),
  month: integer("month"), // 1-12, or null = whole-year lump
  amount: numeric("amount", MONEY).notNull().default("0"),
  currency: text("currency").notNull().default("EUR"),
  ...timestamps,
});

export const propertyIncome = pgTable("property_income", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id")
    .notNull()
    .references(() => properties.id),
  year: integer("year").notNull(),
  income: numeric("income", MONEY).notNull().default("0"),
  roi: numeric("roi", { precision: 10, scale: 6 }).notNull().default("0"),
  ...timestamps,
});

// ---- Realized (closed) trades — from the "Past * Trades" sheets ----------
export const realizedTrades = pgTable("realized_trades", {
  id: serial("id").primaryKey(),
  assetClass: assetClassEnum("asset_class").notNull(),
  symbol: text("symbol").notNull(),
  openDate: date("open_date"),
  closeDate: date("close_date"),
  quantity: numeric("quantity", QTY).notNull().default("0"),
  cost: numeric("cost", MONEY).notNull().default("0"), // money invested
  proceeds: numeric("proceeds", MONEY).notNull().default("0"), // end value
  pl: numeric("pl", MONEY).notNull().default("0"), // realized return
  currency: text("currency").notNull().default("USD"),
  ...timestamps,
});

// Itemised acquisition costs + sale proceeds per property. Total investment is
// the sum of `acquisition` rows; sale proceeds the sum of `sale` rows.
export const propertyLedger = pgTable("property_ledger", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id")
    .notNull()
    .references(() => properties.id),
  kind: propertyLedgerKindEnum("kind").notNull(),
  label: text("label").notNull(), // e.g. "Cumpărat", "Parcare", "Vânzare apartament"
  amount: numeric("amount", MONEY).notNull().default("0"),
  currency: text("currency").notNull().default("EUR"),
  occurredOn: date("occurred_on"),
  notes: text("notes"),
  ...timestamps,
});

// ---- Watchlist + price alerts -------------------------------------------
// Symbols you want to follow (independent of holdings) + candlestick charts.
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(), // e.g. BVB:TLV, META, BTC
  assetClass: assetClassEnum("asset_class").notNull(),
  label: text("label"), // optional display name
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

// Price alerts: notify (in-app) when a symbol crosses a target.
export const priceAlerts = pgTable("price_alerts", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  assetClass: assetClassEnum("asset_class").notNull(),
  targetPrice: numeric("target_price", MONEY).notNull(),
  currency: text("currency").notNull().default("USD"),
  direction: alertDirectionEnum("direction").notNull(),
  active: boolean("active").notNull().default(true),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }),
  triggeredPrice: numeric("triggered_price", MONEY),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  // Set when out-of-app notifications (push/email) were dispatched for this
  // trigger, so the cron dispatcher fires exactly once and never re-spams.
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  note: text("note"),
  ...timestamps,
});

// ---- FX cache (optional) -------------------------------------------------
export const fxRates = pgTable("fx_rates", {
  id: serial("id").primaryKey(),
  base: text("base").notNull(),
  quote: text("quote").notNull(),
  rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- Net-worth history (one row per day, written by the cron) ------------
// A daily snapshot of total net worth + its components, all in EUR, so the
// Overview can chart the trend over time and compute month-over-month deltas.
// `snapshotDate` is unique: re-running the cron on the same day updates the row.
export const netWorthSnapshots = pgTable("net_worth_snapshots", {
  id: serial("id").primaryKey(),
  snapshotDate: date("snapshot_date").notNull().unique(),
  totalEur: numeric("total_eur", MONEY).notNull(),
  personalEur: numeric("personal_eur", MONEY).notNull(),
  investmentsEur: numeric("investments_eur", MONEY).notNull().default("0"),
  accountsEur: numeric("accounts_eur", MONEY).notNull().default("0"),
  loansEur: numeric("loans_eur", MONEY).notNull().default("0"),
  propertiesEur: numeric("properties_eur", MONEY).notNull().default("0"),
  businessesEur: numeric("businesses_eur", MONEY).notNull().default("0"),
  ...timestamps,
});

// ---- Dividends (passive income from holdings) ----------------------------
// One row per declared dividend. Total received is derived from shares held on
// `exDate` (from transactions) × amountPerShare — so quantities aren't re-entered.
export const dividends = pgTable("dividends", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  assetClass: assetClassEnum("asset_class").notNull().default("ro_stock"),
  exDate: date("ex_date"),
  payDate: date("pay_date").notNull(),
  // After-tax cash actually received for this payout, in `currency`. Preferred
  // over per-share because share counts change when you sell. Null on legacy
  // rows, which fall back to amountPerShare × shares-held-on-ex-date.
  netAmount: numeric("net_amount", MONEY),
  amountPerShare: numeric("amount_per_share", MONEY).notNull().default("0"),
  currency: text("currency").notNull().default("RON"),
  note: text("note"),
  ...timestamps,
});

// ---- Cash flow (seeded from Plan Financiar) ------------------------------
export const cashflowIncome = pgTable("cashflow_income", {
  id: serial("id").primaryKey(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull().default(2026),
  label: text("label").notNull(), // client
  amount: numeric("amount", MONEY).notNull(),
  currency: text("currency").notNull().default("GBP"),
  amountEur: numeric("amount_eur", MONEY).notNull(),
  category: text("category"),
  ...timestamps,
});

export const cashflowExpense = pgTable("cashflow_expense", {
  id: serial("id").primaryKey(),
  month: integer("month").notNull(),
  year: integer("year").notNull().default(2026),
  label: text("label").notNull(), // explicatie
  amount: numeric("amount", MONEY).notNull(),
  currency: text("currency").notNull().default("GBP"),
  amountEur: numeric("amount_eur", MONEY).notNull(),
  category: text("category"),
  ...timestamps,
});

// ---- Wedding budget (editable rows) -------------------------------------
export const weddingItems = pgTable("wedding_items", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  paid: numeric("paid", MONEY).notNull().default("0"),
  remaining: numeric("remaining", MONEY).notNull().default("0"),
  currency: text("currency").notNull().default("RON"),
  ...timestamps,
});

// ---- Wedding gift obligations (editable rows) ----------------------------
export const weddingGifts = pgTable("wedding_gifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("Nuntă"), // Nuntă | Botez | …
  amount: numeric("amount", MONEY).notNull().default("0"),
  currency: text("currency").notNull().default("RON"),
  ...timestamps,
});

// ---- Income legend (tag each Venituri source to a category) --------------
export const incomeLegend = pgTable("income_legend", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(), // matches cashflow_income.label
  category: text("category").notNull().default("other"),
  customLabel: text("custom_label"), // e.g. the named startup for "startup_income"
  ...timestamps,
});

// ---- Businesses ----------------------------------------------------------
// A business is tracked like a property: the entity carries an optional
// `valuation` that counts toward net worth while active, and a separate ledger
// holds its periodic P&L (revenue / COGS / etc.).
export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("EUR"),
  status: businessStatusEnum("status").notNull().default("active"),
  // Optional current valuation; null = not valued. Counts toward net worth
  // only while status = active.
  valuation: numeric("valuation", MONEY),
  startedOn: date("started_on"),
  notes: text("notes"),
  ...timestamps,
});

// Periodic profit & loss entries for a business. One row per (year, month, kind);
// month null = whole-year lump. All amounts in their own currency, normalised to
// EUR by the page layer.
export const businessLedger = pgTable("business_ledger", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  year: integer("year").notNull(),
  month: integer("month"), // 1-12, or null = whole-year lump
  kind: businessLedgerKindEnum("kind").notNull().default("revenue"),
  amount: numeric("amount", MONEY).notNull().default("0"),
  currency: text("currency").notNull().default("EUR"),
  label: text("label"), // e.g. "Stripe payouts", "Contractor"
  notes: text("notes"),
  ...timestamps,
});

// ---- Clients -------------------------------------------------------------
// A client holds one or more service lines (a retainer, scoped work, hosting,
// reporting, hourly, …). Expected revenue (MRR/ARR) is computed from the lines.
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: clientStatusEnum("status").notNull().default("active"),
  currency: text("currency").notNull().default("EUR"),
  notes: text("notes"),
  ...timestamps,
});

export const clientServices = pgTable("client_services", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  type: serviceTypeEnum("type").notNull().default("monthly_retainer"),
  label: text("label"), // description of the work
  amount: numeric("amount", MONEY).notNull().default("0"),
  currency: text("currency").notNull().default("EUR"),
  cadence: serviceCadenceEnum("cadence").notNull().default("monthly"),
  timesPerYear: integer("times_per_year"), // for cadence = times_per_year
  hours: numeric("hours", { precision: 12, scale: 2 }), // hourly lines
  rate: numeric("rate", MONEY), // hourly rate
  startDate: date("start_date"),
  renewalDate: date("renewal_date"), // next renewal / next reporting date
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  ...timestamps,
});

// ---- Share links (read-only preview links) ------------------------------
// A revocable, optionally-expiring link that grants VIEW-ONLY access to a
// chosen subset of tabs. The raw token lives only in the shared URL; we store
// its SHA-256 hash. No session cookie is ever issued for a share viewer, so
// share traffic can never reach the session-gated Server Actions.
export const shareLinks = pgTable("share_links", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(), // SHA-256(raw token), hex
  label: text("label").notNull().default(""),
  allowedTabs: text("allowed_tabs").array().notNull().default([]), // nav hrefs
  expiresAt: timestamp("expires_at", { withTimezone: true }), // null = never
  revokedAt: timestamp("revoked_at", { withTimezone: true }), // null = active
  lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
  ...timestamps,
});

// ==========================================================================
// Self-host packaging tables (NomadWealth — Phase 7C)
// These turn the single-user, env-configured app into a deployable product:
// first-run setup state, the owner account, license activation, and a log of
// in-app import jobs. They live in the BUYER'S own Neon DB — the vendor never
// sees them. See CLAUDE.md ("no vendor data access" invariant).
// ==========================================================================

// Singleton row (id always = 1) holding global install state.
export const appConfig = pgTable("app_config", {
  id: integer("id").primaryKey().default(1),
  setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true }),
  schemaVersion: text("schema_version").notNull(),
  displayCurrency: text("display_currency").notNull().default("EUR"),
  // Opt-in (default OFF): when true, the install sends an OPAQUE activation ping
  // (hashed key + tier only, never financial data) to the vendor on activation.
  // Honors the "telemetry is opt-in" invariant. See lib/activation-ping.ts.
  shareActivation: boolean("share_activation").notNull().default(false),
  // Web Push VAPID keypair, generated once on first push-subscribe. Both live
  // only in the buyer's own Neon — nothing is shared with the vendor.
  vapidPublicKey: text("vapid_public_key"),
  vapidPrivateKey: text("vapid_private_key"),
  // Highest net-worth milestone already celebrated (EUR), so the milestone
  // check notifies each threshold exactly once. Null until first cron run.
  lastMilestoneEur: numeric("last_milestone_eur", MONEY),
  ...timestamps,
});

// The single owner account. Password is hashed with PBKDF2 (Web Crypto) — no
// native bcrypt dependency, so it runs in serverless/edge. See lib/owner.ts.
export const owner = pgTable("owner", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  // Optional TOTP two-factor auth (RFC 6238). `totpSecret` is a base32 secret;
  // it may be present-but-unconfirmed (written by /api/2fa/setup) — login only
  // requires a code when `totpEnabled` is true. `backupCodes` holds PBKDF2
  // hashes of single-use recovery codes (same hash format as the password);
  // each is removed from the array as it is consumed. All of this lives only in
  // the buyer's own Neon DB — see CLAUDE.md ("no vendor data access").
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  backupCodes: jsonb("backup_codes").$type<string[]>(),
  // Session generation: bumped on password change, 2FA change, or "log out all
  // devices". Tokens carry the value they were signed with; stale tokens are
  // rejected by requireSession. See lib/auth.ts.
  sessionVersion: integer("session_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Singleton row holding the activated license. Activation is verified offline
// (signed key) — see lib/license.ts. No financial data ever leaves the install.
export const license = pgTable("license", {
  id: integer("id").primaryKey().default(1),
  key: text("key").notNull(),
  activatedAt: timestamp("activated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  tier: text("tier").notNull().default("self-host"), // self-host | updates | trial
  updatesUntil: timestamp("updates_until", { withTimezone: true }),
});

// A record of each web import (audit + idempotency support).
export const importJobs = pgTable("import_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetClass: text("asset_class").notNull(),
  status: text("status").notNull().default("pending"), // pending|committed|failed
  rowCount: integer("row_count"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---- Notifications -------------------------------------------------------
// How the owner wants price-alert notifications delivered. One row per channel
// type (unique). `config` holds channel-specific settings (e.g. the email
// address). Everything lives only in the buyer's own Neon — see CLAUDE.md.
export const notificationChannels = pgTable("notification_channels", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // webpush | email
  enabled: boolean("enabled").notNull().default(false),
  config: jsonb("config").$type<Record<string, string>>(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ...timestamps,
});

// Web Push subscriptions (one per browser/device the owner enabled). Keyed by
// the push endpoint; p256dh + auth are the client public keys used to encrypt.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Brute-force protection for /api/auth/login. One row per limiter key
// ("ip:<addr>" or "global"); consecutive failures earn an exponential lockout.
// Lives only in the buyer's own Neon — no external rate-limit service needed.
export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  failures: integer("failures").notNull().default(0),
  lastFailureAt: timestamp("last_failure_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

// Rows inserted by the "Load sample data" onboarding action, so "Clear sample
// data" can hard-delete exactly what was seeded and nothing else.
export const sampleRows = pgTable("sample_rows", {
  id: serial("id").primaryKey(),
  tableName: text("table_name").notNull(),
  rowId: integer("row_id").notNull(),
});

export type AppConfig = typeof appConfig.$inferSelect;
export type Owner = typeof owner.$inferSelect;
export type License = typeof license.$inferSelect;
export type ImportJob = typeof importJobs.$inferSelect;
export type NotificationChannel = typeof notificationChannels.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Convenience type exports
export type ShareLink = typeof shareLinks.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type BusinessLedger = typeof businessLedger.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type ClientService = typeof clientServices.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type WeddingItem = typeof weddingItems.$inferSelect;
export type WeddingGift = typeof weddingGifts.$inferSelect;
export type IncomeLegend = typeof incomeLegend.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type LoanPayment = typeof loanPayments.$inferSelect;
export type LoanReceipt = typeof loanReceipts.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type PropertyIncome = typeof propertyIncome.$inferSelect;
export type PropertyRent = typeof propertyRent.$inferSelect;
export type PropertyLedger = typeof propertyLedger.$inferSelect;
export type CashflowIncome = typeof cashflowIncome.$inferSelect;
export type CashflowExpense = typeof cashflowExpense.$inferSelect;
export type RealizedTrade = typeof realizedTrades.$inferSelect;
export type Watchlist = typeof watchlist.$inferSelect;
export type PriceAlert = typeof priceAlerts.$inferSelect;
export type NetWorthSnapshot = typeof netWorthSnapshots.$inferSelect;
export type Dividend = typeof dividends.$inferSelect;
