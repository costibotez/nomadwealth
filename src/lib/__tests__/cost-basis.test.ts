import { describe, it, expect } from "vitest";
import { movingAverageBasis } from "@/lib/cost-basis";
import type { TransactionRow } from "@/db/queries";

// EUR -> X rates (same shape as FxData.rates); toEur divides by the rate.
const RATES: Record<string, number> = { EUR: 1, USD: 1.147 };
const toEur = (amount: number, currency: string) => {
  const r = RATES[currency.toUpperCase()];
  return !r ? amount : amount / r;
};

function tx(p: Partial<TransactionRow>): TransactionRow {
  return {
    id: 0,
    tradeDate: "2026-01-01",
    direction: "buy",
    assetClass: "us_stock",
    symbol: "MU",
    quantity: 0,
    unitCost: 0,
    costCurrency: "EUR",
    currentPrice: 0,
    priceCurrency: "EUR",
    commission: null,
    saleTax: null,
    maturityDate: null,
    notes: null,
    ...p,
  };
}

describe("movingAverageBasis", () => {
  it("resets the cost basis after a full sell-out (buy → sell → re-buy)", () => {
    // Real MU scenario from the dashboard bug report: a USD position opened and
    // fully closed, then re-opened in EUR. The open position must reflect ONLY
    // the two EUR lots — not a lifetime pool of every buy, and not USD+EUR summed.
    const b = movingAverageBasis(
      [
        tx({ tradeDate: "2026-03-30", direction: "buy", quantity: 4.0087, unitCost: 326.22, costCurrency: "USD" }),
        tx({ tradeDate: "2026-04-01", direction: "sell", quantity: 4.0087, unitCost: 362.8, costCurrency: "USD" }),
        tx({ tradeDate: "2026-07-16", direction: "buy", quantity: 4.9025, unitCost: 743.58, costCurrency: "EUR", commission: 3.65 }),
        tx({ tradeDate: "2026-07-16", direction: "buy", quantity: 0.0998, unitCost: 766.83, costCurrency: "EUR", commission: 0.08 }),
      ],
      toEur,
    );

    expect(b.remainingQty).toBeCloseTo(5.0023, 4);
    // Basis is the two July EUR lots incl. fees: 3649.06 + 76.61 = 3725.67
    expect(b.investedEur).toBeCloseTo(3725.67, 1);
    // Native avg cost is EUR here (the open lots are EUR), NOT the 558.58 blend.
    expect(b.avgCostNative).toBeCloseTo(744.79, 1);

    // One realized entry for the April sell, priced against the March lot only.
    expect(b.realized).toHaveLength(1);
    const sell = b.realized[0];
    expect(sell.costEur).toBeCloseTo(1307.71 / 1.147, 1);
    expect(sell.proceedsEur).toBeCloseTo(1454.35 / 1.147, 1);
    expect(sell.plEur).toBeGreaterThan(0); // sold higher than bought
  });

  it("uses average cost across still-open lots (partial sell)", () => {
    const b = movingAverageBasis(
      [
        tx({ tradeDate: "2026-01-01", direction: "buy", quantity: 10, unitCost: 100 }),
        tx({ tradeDate: "2026-02-01", direction: "buy", quantity: 10, unitCost: 140 }),
        tx({ tradeDate: "2026-03-01", direction: "sell", quantity: 5, unitCost: 130 }),
      ],
      toEur,
    );
    expect(b.remainingQty).toBeCloseTo(15, 6);
    // avg cost 120; 15 shares remain → 1800 invested
    expect(b.avgCostNative).toBeCloseTo(120, 6);
    expect(b.investedEur).toBeCloseTo(1800, 6);
    // realized: proceeds 650 − cost 600 = +50
    expect(b.realized[0].plEur).toBeCloseTo(50, 6);
  });

  it("returns a flat position when nothing is sold", () => {
    const b = movingAverageBasis(
      [tx({ direction: "buy", quantity: 2, unitCost: 50, commission: 1 })],
      toEur,
    );
    expect(b.remainingQty).toBe(2);
    expect(b.investedEur).toBeCloseTo(101, 6); // 2*50 + 1 fee
    expect(b.avgCostNative).toBeCloseTo(50.5, 6);
    expect(b.realized).toHaveLength(0);
  });
});
