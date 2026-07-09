"use server";

/**
 * All data mutations. Server Actions, Zod-validated. Every write is reachable
 * only behind the auth gate (middleware). Deletes are SOFT (set deleted_at) and
 * recoverable from /trash.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-actions";
import { eq, sql, and, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  transactions,
  loans,
  loanPayments,
  loanReceipts,
  accounts,
  properties,
  propertyRent,
  propertyLedger,
  weddingItems,
  weddingGifts,
  incomeLegend,
  watchlist,
  priceAlerts,
  dividends,
  businesses,
  businessLedger,
  clients,
  clientServices,
} from "@/db/schema";

const REVALIDATE = ["/dashboard", "/dashboard/holdings", "/dashboard/transactions", "/dashboard/performance", "/dashboard/loans", "/dashboard/real-estate", "/dashboard/dividends", "/dashboard/trash"];
function revalidateAll() {
  for (const p of REVALIDATE) revalidatePath(p);
}

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(e: unknown): ActionResult {
  const msg = e instanceof z.ZodError ? e.issues.map((i) => i.message).join(", ") : String(e);
  return { ok: false, error: msg };
}

// ---- Transactions --------------------------------------------------------
const txnSchema = z.object({
  tradeDate: z.string().min(1, "Date is required"),
  direction: z.enum(["buy", "sell"]),
  assetClass: z.enum(["ro_stock", "us_stock", "crypto", "reit", "mutual_fund", "gold", "other"]),
  symbol: z.string().min(1, "Symbol is required").max(64),
  quantity: z.coerce.number().finite(),
  unitCost: z.coerce.number().min(0),
  costCurrency: z.string().min(2).max(4).default("USD"),
  currentPrice: z.coerce.number().min(0),
  priceCurrency: z.string().min(2).max(4).default("USD"),
  commission: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().min(0).nullable().default(null),
  ),
  saleTax: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().min(0).nullable().default(null),
  ),
  maturityDate: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function createTransaction(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = txnSchema.parse(input);
    await db.insert(transactions).values({
      tradeDate: v.tradeDate,
      direction: v.direction,
      assetClass: v.assetClass,
      symbol: v.symbol,
      quantity: String(v.quantity),
      unitCost: String(v.unitCost),
      costCurrency: v.costCurrency,
      currentPrice: String(v.currentPrice),
      priceCurrency: v.priceCurrency,
      commission: v.commission == null ? null : String(v.commission),
      saleTax: v.saleTax == null ? null : String(v.saleTax),
      maturityDate: v.maturityDate || null,
      notes: v.notes || null,
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateTransaction(id: number, input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = txnSchema.parse(input);
    await db
      .update(transactions)
      .set({
        tradeDate: v.tradeDate,
        direction: v.direction,
        assetClass: v.assetClass,
        symbol: v.symbol,
        quantity: String(v.quantity),
        unitCost: String(v.unitCost),
        costCurrency: v.costCurrency,
        currentPrice: String(v.currentPrice),
        priceCurrency: v.priceCurrency,
        commission: v.commission == null ? null : String(v.commission),
        saleTax: v.saleTax == null ? null : String(v.saleTax),
        maturityDate: v.maturityDate || null,
        notes: v.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Bulk update current_price by symbol (the "update prices" screen). */
export async function updatePrices(
  updates: { symbol: string; assetClass: string; currentPrice: number }[],
): Promise<ActionResult> {
  try {
    await requireSession();
    const schema = z.array(
      z.object({
        symbol: z.string(),
        assetClass: z.string(),
        currentPrice: z.coerce.number().min(0),
      }),
    );
    const list = schema.parse(updates);
    for (const u of list) {
      await db
        .update(transactions)
        .set({ currentPrice: String(u.currentPrice), updatedAt: new Date() })
        .where(sql`${transactions.symbol} = ${u.symbol} AND ${transactions.assetClass} = ${u.assetClass} AND ${transactions.deletedAt} IS NULL`);
    }
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Loans ---------------------------------------------------------------
const loanSchema = z.object({
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

export async function createLoan(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = loanSchema.parse(input);
    await db.insert(loans).values({
      borrower: v.borrower,
      principal: String(v.principal),
      currency: v.currency,
      backed: v.backed,
      startDate: v.startDate || null,
      interestRate: String(v.interestRate),
      compounding: v.compounding,
      termMonths: v.termMonths ?? null,
      status: v.status,
      notes: v.notes || null,
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateLoan(id: number, input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = loanSchema.parse(input);
    await db
      .update(loans)
      .set({
        borrower: v.borrower,
        principal: String(v.principal),
        currency: v.currency,
        backed: v.backed,
        startDate: v.startDate || null,
        interestRate: String(v.interestRate),
        compounding: v.compounding,
        termMonths: v.termMonths ?? null,
        status: v.status,
        notes: v.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(loans.id, id));
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleLoanPayment(id: number, paid: boolean): Promise<ActionResult> {
  try {
    await requireSession();
    await db
      .update(loanPayments)
      .set({
        paid,
        paidDate: paid ? new Date().toISOString().slice(0, 10) : null,
        updatedAt: new Date(),
      })
      .where(eq(loanPayments.id, id));
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Loan payments schedule (expected dues) ------------------------------
const loanPaymentSchema = z.object({
  loanId: z.coerce.number().int().positive(),
  dueDate: z.string().min(1, "Due date is required"),
  amount: z.coerce.number().min(0),
  currency: z.string().min(2).max(4),
});

export async function addLoanPayment(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = loanPaymentSchema.parse(input);
    await db.insert(loanPayments).values({
      loanId: v.loanId,
      dueDate: v.dueDate,
      amount: String(v.amount),
      currency: v.currency,
      paid: false,
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLoanPayment(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(loanPayments).set({ deletedAt: new Date() }).where(eq(loanPayments.id, id));
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Dividends -----------------------------------------------------------
const dividendSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(64),
  assetClass: z.enum(["ro_stock", "us_stock", "crypto", "reit", "mutual_fund", "gold", "other"]),
  exDate: z.string().optional().nullable(),
  payDate: z.string().min(1, "Pay date is required"),
  // Net (after-tax) cash actually received, in `currency`. This is the value the
  // form now collects. amountPerShare stays optional for legacy/back-compat.
  netAmount: z.coerce.number().min(0),
  amountPerShare: z.coerce.number().min(0).optional().default(0),
  currency: z.string().min(2).max(4),
  note: z.string().max(300).optional().nullable(),
});

export async function addDividend(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = dividendSchema.parse(input);
    await db.insert(dividends).values({
      symbol: v.symbol,
      assetClass: v.assetClass,
      exDate: v.exDate || null,
      payDate: v.payDate,
      netAmount: String(v.netAmount),
      amountPerShare: String(v.amountPerShare),
      currency: v.currency,
      note: v.note || null,
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateDividend(id: number, input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = dividendSchema.parse(input);
    await db
      .update(dividends)
      .set({
        symbol: v.symbol,
        assetClass: v.assetClass,
        exDate: v.exDate || null,
        payDate: v.payDate,
        netAmount: String(v.netAmount),
        amountPerShare: String(v.amountPerShare),
        currency: v.currency,
        note: v.note || null,
        updatedAt: new Date(),
      })
      .where(eq(dividends.id, id));
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteDividend(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(dividends).set({ deletedAt: new Date() }).where(eq(dividends.id, id));
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Loan receipts ledger ------------------------------------------------
const receiptSchema = z.object({
  loanId: z.coerce.number().int().positive(),
  kind: z.enum(["principal", "interest"]),
  amount: z.coerce.number().min(0),
  currency: z.string().min(2).max(4),
  receivedOn: z.string().min(1, "Date is required"),
  method: z.enum(["cash", "bank_transfer"]),
  bank: z.string().max(80).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

export async function addLoanReceipt(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = receiptSchema.parse(input);
    await db.insert(loanReceipts).values({
      loanId: v.loanId,
      kind: v.kind,
      amount: String(v.amount),
      currency: v.currency,
      receivedOn: v.receivedOn,
      method: v.method,
      bank: v.method === "bank_transfer" ? v.bank || null : null,
      notes: v.notes || null,
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLoanReceipt(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(loanReceipts).set({ deletedAt: new Date() }).where(eq(loanReceipts.id, id));
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Accounts ------------------------------------------------------------
const accountSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["crypto", "personal_cash", "company_cash", "savings", "brokerage"]),
  balance: z.coerce.number(),
  currency: z.string().min(2).max(4),
  isCompany: z.coerce.boolean().default(false),
  notes: z.string().max(500).optional().nullable(),
});

export async function upsertAccount(id: number | null, input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = accountSchema.parse(input);
    const values = {
      name: v.name,
      type: v.type,
      balance: String(v.balance),
      currency: v.currency,
      isCompany: v.isCompany,
      notes: v.notes || null,
    };
    if (id) await db.update(accounts).set({ ...values, updatedAt: new Date() }).where(eq(accounts.id, id));
    else await db.insert(accounts).values(values);
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Properties ----------------------------------------------------------
const propertySchema = z.object({
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

export async function upsertProperty(id: number | null, input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = propertySchema.parse(input);
    const values = {
      name: v.name,
      value: String(v.value),
      currency: v.currency,
      monthlyRent: String(v.monthlyRent),
      isRented: v.isRented,
      status: v.status,
      purchaseDate: v.purchaseDate || null,
      purchasePrice: v.purchasePrice != null ? String(v.purchasePrice) : null,
      saleDate: v.saleDate || null,
      salePrice: v.salePrice != null ? String(v.salePrice) : null,
      notes: v.notes || null,
    };
    if (id) await db.update(properties).set({ ...values, updatedAt: new Date() }).where(eq(properties.id, id));
    else await db.insert(properties).values(values);
    revalidatePath("/dashboard/real-estate");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Property rent ledger ------------------------------------------------
const rentSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(1990).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional().nullable(),
  amount: z.coerce.number().min(0),
  currency: z.string().min(2).max(4),
});

export async function addRent(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = rentSchema.parse(input);
    await db.insert(propertyRent).values({
      propertyId: v.propertyId,
      year: v.year,
      month: v.month ?? null,
      amount: String(v.amount),
      currency: v.currency,
    });
    revalidatePath("/dashboard/real-estate");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteRent(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(propertyRent).set({ deletedAt: new Date() }).where(eq(propertyRent.id, id));
    revalidatePath("/dashboard/real-estate");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Property cost / sale ledger -----------------------------------------
const ledgerSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  kind: z.enum(["acquisition", "sale"]),
  label: z.string().min(1).max(120),
  amount: z.coerce.number().min(0),
  currency: z.string().min(2).max(4),
  occurredOn: z.string().optional().nullable(),
});

export async function addPropertyLedger(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = ledgerSchema.parse(input);
    await db.insert(propertyLedger).values({
      propertyId: v.propertyId,
      kind: v.kind,
      label: v.label,
      amount: String(v.amount),
      currency: v.currency,
      occurredOn: v.occurredOn || null,
    });
    revalidatePath("/dashboard/real-estate");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePropertyLedger(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(propertyLedger).set({ deletedAt: new Date() }).where(eq(propertyLedger.id, id));
    revalidatePath("/dashboard/real-estate");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Wedding budget ------------------------------------------------------
const weddingSchema = z.object({
  label: z.string().min(1).max(120),
  paid: z.coerce.number().min(0),
  remaining: z.coerce.number().min(0),
  currency: z.string().min(2).max(4).default("RON"),
});

export async function upsertWeddingItem(id: number | null, input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = weddingSchema.parse(input);
    const values = {
      label: v.label,
      paid: String(v.paid),
      remaining: String(v.remaining),
      currency: v.currency,
    };
    if (id) await db.update(weddingItems).set({ ...values, updatedAt: new Date() }).where(eq(weddingItems.id, id));
    else await db.insert(weddingItems).values(values);
    revalidatePath("/dashboard/wedding");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteWeddingItem(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(weddingItems).set({ deletedAt: new Date() }).where(eq(weddingItems.id, id));
    revalidatePath("/dashboard/wedding");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const giftSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(40),
  amount: z.coerce.number().min(0),
  currency: z.string().min(2).max(4).default("RON"),
});

export async function upsertWeddingGift(id: number | null, input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = giftSchema.parse(input);
    const values = { name: v.name, type: v.type, amount: String(v.amount), currency: v.currency };
    if (id) await db.update(weddingGifts).set({ ...values, updatedAt: new Date() }).where(eq(weddingGifts.id, id));
    else await db.insert(weddingGifts).values(values);
    revalidatePath("/dashboard/wedding");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteWeddingGift(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(weddingGifts).set({ deletedAt: new Date() }).where(eq(weddingGifts.id, id));
    revalidatePath("/dashboard/wedding");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Income legend (tag a source -> category) ----------------------------
const legendSchema = z.object({
  label: z.string().min(1).max(160),
  category: z.string().min(1).max(40),
  customLabel: z.string().max(120).optional().nullable(),
});

export async function setIncomeLegend(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = legendSchema.parse(input);
    const existing = await db
      .select({ id: incomeLegend.id })
      .from(incomeLegend)
      .where(and(isNull(incomeLegend.deletedAt), eq(incomeLegend.label, v.label)))
      .limit(1);
    if (existing.length) {
      await db
        .update(incomeLegend)
        .set({ category: v.category, customLabel: v.customLabel || null, updatedAt: new Date() })
        .where(eq(incomeLegend.id, existing[0].id));
    } else {
      await db.insert(incomeLegend).values({
        label: v.label,
        category: v.category,
        customLabel: v.customLabel || null,
      });
    }
    revalidatePath("/dashboard/cashflow");
    revalidatePath("/dashboard/legend");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Watchlist -----------------------------------------------------------
const ASSET_CLASSES = ["ro_stock", "us_stock", "crypto", "reit", "mutual_fund", "gold", "other"] as const;

const watchlistSchema = z.object({
  symbol: z.string().min(1).max(64),
  assetClass: z.enum(ASSET_CLASSES),
  label: z.string().max(120).optional().nullable(),
});

export async function addWatchlistItem(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = watchlistSchema.parse(input);
    await db.insert(watchlist).values({
      symbol: v.symbol.trim(),
      assetClass: v.assetClass,
      label: v.label || null,
    });
    revalidatePath("/dashboard/watchlist");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteWatchlistItem(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(watchlist).set({ deletedAt: new Date() }).where(eq(watchlist.id, id));
    revalidatePath("/dashboard/watchlist");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Price alerts --------------------------------------------------------
const alertSchema = z.object({
  symbol: z.string().min(1).max(64),
  assetClass: z.enum(ASSET_CLASSES),
  targetPrice: z.coerce.number().positive(),
  currency: z.string().min(2).max(4).default("USD"),
  direction: z.enum(["above", "below"]),
  note: z.string().max(200).optional().nullable(),
});

export async function addPriceAlert(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = alertSchema.parse(input);
    await db.insert(priceAlerts).values({
      symbol: v.symbol.trim(),
      assetClass: v.assetClass,
      targetPrice: String(v.targetPrice),
      currency: v.currency,
      direction: v.direction,
      note: v.note || null,
    });
    revalidatePath("/dashboard/watchlist");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePriceAlert(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(priceAlerts).set({ deletedAt: new Date() }).where(eq(priceAlerts.id, id));
    revalidatePath("/dashboard/watchlist");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Reset a triggered alert so it can fire again. */
export async function resetPriceAlert(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db
      .update(priceAlerts)
      .set({ triggeredAt: null, triggeredPrice: null, acknowledgedAt: null, active: true, updatedAt: new Date() })
      .where(eq(priceAlerts.id, id));
    revalidatePath("/dashboard/watchlist");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Mark all triggered alerts acknowledged (clears the bell badge). */
export async function acknowledgeAlerts(): Promise<ActionResult> {
  try {
    await requireSession();
    await db
      .update(priceAlerts)
      .set({ acknowledgedAt: new Date() })
      .where(and(isNull(priceAlerts.deletedAt), isNotNull(priceAlerts.triggeredAt), isNull(priceAlerts.acknowledgedAt)));
    revalidatePath("/dashboard/watchlist");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Evaluate active, not-yet-triggered alerts against the given quotes and mark
 * any that crossed their target. Returns the symbols that just triggered (for an
 * in-app toast). Called on price refresh (client) and by the cron.
 */
export async function checkAlerts(
  quotes: { symbol: string; assetClass: string; price: number }[],
): Promise<{ triggered: { symbol: string; direction: string; targetPrice: number; price: number }[] }> {
  try {
    const priceByKey = new Map(quotes.map((q) => [`${q.assetClass}:${q.symbol}`, q.price]));
    const active = await db
      .select()
      .from(priceAlerts)
      .where(and(isNull(priceAlerts.deletedAt), eq(priceAlerts.active, true), isNull(priceAlerts.triggeredAt)));

    const triggered: { symbol: string; direction: string; targetPrice: number; price: number }[] = [];
    for (const a of active) {
      const price = priceByKey.get(`${a.assetClass}:${a.symbol}`);
      if (price == null || !isFinite(price)) continue;
      const target = Number(a.targetPrice);
      const hit = a.direction === "above" ? price >= target : price <= target;
      if (hit) {
        await db
          .update(priceAlerts)
          .set({ triggeredAt: new Date(), triggeredPrice: String(price), updatedAt: new Date() })
          .where(eq(priceAlerts.id, a.id));
        triggered.push({ symbol: a.symbol, direction: a.direction, targetPrice: target, price });
      }
    }
    if (triggered.length) revalidatePath("/dashboard/watchlist");
    return { triggered };
  } catch {
    return { triggered: [] };
  }
}

// ---- Businesses ----------------------------------------------------------
const businessSchema = z.object({
  name: z.string().min(1).max(120),
  currency: z.string().min(2).max(4).default("EUR"),
  status: z.enum(["active", "sold", "closed"]).default("active"),
  valuation: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().min(0).nullable().default(null),
  ),
  startedOn: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function upsertBusiness(id: number | null, input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = businessSchema.parse(input);
    const values = {
      name: v.name,
      currency: v.currency,
      status: v.status,
      valuation: v.valuation == null ? null : String(v.valuation),
      startedOn: v.startedOn || null,
      notes: v.notes || null,
    };
    if (id) await db.update(businesses).set({ ...values, updatedAt: new Date() }).where(eq(businesses.id, id));
    else await db.insert(businesses).values(values);
    revalidatePath("/dashboard/businesses");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBusiness(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(businesses).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(businesses.id, id));
    revalidatePath("/dashboard/businesses");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const businessLedgerSchema = z.object({
  businessId: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(1990).max(2100),
  month: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().int().min(1).max(12).nullable().default(null),
  ),
  kind: z.enum(["revenue", "cogs", "ad_spend", "expense"]),
  amount: z.coerce.number().min(0),
  currency: z.string().min(2).max(4),
  label: z.string().max(120).optional().nullable(),
});

export async function addBusinessLedger(input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = businessLedgerSchema.parse(input);
    await db.insert(businessLedger).values({
      businessId: v.businessId,
      year: v.year,
      month: v.month ?? null,
      kind: v.kind,
      amount: String(v.amount),
      currency: v.currency,
      label: v.label || null,
    });
    revalidatePath("/dashboard/businesses");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBusinessLedger(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(businessLedger).set({ deletedAt: new Date() }).where(eq(businessLedger.id, id));
    revalidatePath("/dashboard/businesses");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Clients -------------------------------------------------------------
const clientSchema = z.object({
  name: z.string().min(1).max(120),
  status: z.enum(["active", "paused", "churned"]).default("active"),
  currency: z.string().min(2).max(4).default("EUR"),
  notes: z.string().max(500).optional().nullable(),
});

export async function upsertClient(id: number | null, input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = clientSchema.parse(input);
    const values = { name: v.name, status: v.status, currency: v.currency, notes: v.notes || null };
    if (id) await db.update(clients).set({ ...values, updatedAt: new Date() }).where(eq(clients.id, id));
    else await db.insert(clients).values(values);
    revalidatePath("/dashboard/clients");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteClient(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(clients).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(clients.id, id));
    revalidatePath("/dashboard/clients");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const clientServiceSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  type: z.enum(["monthly_retainer", "one_off", "annual_hosting", "marketing", "reporting", "hourly", "other"]),
  label: z.string().max(160).optional().nullable(),
  amount: z.coerce.number().min(0).default(0),
  currency: z.string().min(2).max(4),
  cadence: z.enum(["weekly", "monthly", "quarterly", "four_monthly", "annual", "one_off", "times_per_year"]),
  timesPerYear: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().int().min(1).max(366).nullable().default(null),
  ),
  hours: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().min(0).nullable().default(null),
  ),
  rate: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().min(0).nullable().default(null),
  ),
  startDate: z.string().optional().nullable(),
  renewalDate: z.string().optional().nullable(),
  active: z.coerce.boolean().default(true),
});

export async function upsertClientService(id: number | null, input: unknown): Promise<ActionResult> {
  try {
    await requireSession();
    const v = clientServiceSchema.parse(input);
    const values = {
      clientId: v.clientId,
      type: v.type,
      label: v.label || null,
      amount: String(v.amount),
      currency: v.currency,
      cadence: v.cadence,
      timesPerYear: v.timesPerYear ?? null,
      hours: v.hours == null ? null : String(v.hours),
      rate: v.rate == null ? null : String(v.rate),
      startDate: v.startDate || null,
      renewalDate: v.renewalDate || null,
      active: v.active,
    };
    if (id) await db.update(clientServices).set({ ...values, updatedAt: new Date() }).where(eq(clientServices.id, id));
    else await db.insert(clientServices).values(values);
    revalidatePath("/dashboard/clients");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteClientService(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await db.update(clientServices).set({ deletedAt: new Date() }).where(eq(clientServices.id, id));
    revalidatePath("/dashboard/clients");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- Soft delete / restore / purge --------------------------------------
type Entity = "transaction" | "loan" | "account" | "property" | "loan_payment";

function table(entity: Entity) {
  switch (entity) {
    case "transaction": return transactions;
    case "loan": return loans;
    case "account": return accounts;
    case "property": return properties;
    case "loan_payment": return loanPayments;
  }
}

export async function softDelete(entity: Entity, id: number): Promise<ActionResult> {
  try {
    await requireSession();
    const t = table(entity);
    await db.update(t).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(t.id, id));
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function restore(entity: Entity, id: number): Promise<ActionResult> {
  try {
    await requireSession();
    const t = table(entity);
    await db.update(t).set({ deletedAt: null, updatedAt: new Date() }).where(eq(t.id, id));
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Permanent delete — requires the caller to pass the typed confirmation. */
export async function purge(entity: Entity, id: number, confirmation: string): Promise<ActionResult> {
  try {
    await requireSession();
    if (confirmation !== "DELETE") return { ok: false, error: 'Type "DELETE" to confirm.' };
    const t = table(entity);
    await db.delete(t).where(eq(t.id, id));
    revalidateAll();
    revalidatePath("/dashboard/trash");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
