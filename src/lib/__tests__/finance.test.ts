import { describe, it, expect } from "vitest";
import {
  aggregateSymbol,
  expectedTotalInterest,
  loanReturn,
  loanState,
  annualizedIRR,
  projectNetWorth,
  monthsBetween,
} from "@/lib/finance";

describe("aggregateSymbol", () => {
  it("computes avg cost and P/L across lots", () => {
    const a = aggregateSymbol("X", [
      { symbol: "X", quantity: 10, unitCost: 100, currentPrice: 120 },
      { symbol: "X", quantity: 10, unitCost: 140, currentPrice: 120 },
    ]);
    expect(a.quantity).toBe(20);
    expect(a.invested).toBe(2400);
    expect(a.currentValue).toBe(2400);
    expect(a.avgCost).toBe(120);
    expect(a.unrealizedPl).toBe(0);
    expect(a.unrealizedPct).toBe(0);
  });

  it("returns null percent when cost basis is zero (bonus shares)", () => {
    const a = aggregateSymbol("BONUS", [
      { symbol: "BONUS", quantity: 5, unitCost: 0, currentPrice: 10 },
    ]);
    expect(a.unrealizedPct).toBeNull();
    expect(a.currentValue).toBe(50);
  });
});

describe("expectedTotalInterest", () => {
  it("simple interest", () => {
    expect(expectedTotalInterest(1000, 10, 12, "simple")).toBeCloseTo(100, 5);
  });
  it("monthly compounding > simple", () => {
    const m = expectedTotalInterest(1000, 12, 12, "monthly");
    expect(m).toBeGreaterThan(120);
  });
  it("zero rate => zero interest (principal-only loan)", () => {
    expect(expectedTotalInterest(10000, 0, 60, "simple")).toBe(0);
  });
});

describe("loanReturn", () => {
  it("tracks repaid vs remaining and next due", () => {
    const start = new Date("2024-01-01");
    const r = loanReturn(1200, start, [
      { date: new Date("2024-02-01"), amount: 100, paid: true },
      { date: new Date("2024-03-01"), amount: 100, paid: true },
      { date: new Date("2024-04-01"), amount: 100, paid: false },
    ]);
    expect(r.principalRepaid).toBe(200);
    expect(r.principalRemaining).toBe(1000);
    expect(r.paidCount).toBe(2);
    expect(r.totalCount).toBe(3);
    expect(r.nextDue?.amount).toBe(100);
  });
});

describe("loanState", () => {
  it("folds scheduled payments + lump receipts; interest receipts don't cut principal", () => {
    const start = new Date("2024-01-01");
    const s = loanState(
      10000,
      start,
      [{ date: new Date("2024-02-01"), amount: 500, paid: true }],
      [
        { date: new Date("2024-06-01"), amount: 3000, kind: "principal" },
        { date: new Date("2024-06-01"), amount: 400, kind: "interest" },
      ],
    );
    expect(s.principalRepaid).toBe(3500); // 500 scheduled + 3000 principal receipt
    expect(s.principalRemaining).toBe(6500);
    expect(s.interestReceived).toBe(400);
    expect(s.irr).not.toBeNull();
  });
});

describe("annualizedIRR", () => {
  it("≈10% for a one-year 10% return", () => {
    const irr = annualizedIRR([
      { date: new Date("2024-01-01"), amount: -1000 },
      { date: new Date("2025-01-01"), amount: 1100 },
    ]);
    expect(irr).not.toBeNull();
    expect(irr!).toBeCloseTo(0.1, 2);
  });
  it("returns null without a sign change", () => {
    expect(
      annualizedIRR([
        { date: new Date("2024-01-01"), amount: 100 },
        { date: new Date("2025-01-01"), amount: 100 },
      ]),
    ).toBeNull();
  });
});

describe("projectNetWorth", () => {
  it("grows financial assets and contributes monthly", () => {
    const pts = projectNetWorth({
      startingFinancial: 10000,
      startingProperty: 5000,
      monthlyContribution: 100,
      annualReturnPct: 6,
      propertyGrowthPct: 2,
      years: 10,
    });
    expect(pts).toHaveLength(11);
    expect(pts[0].total).toBe(15000);
    expect(pts[10].contributed).toBe(12000);
    expect(pts[10].total).toBeGreaterThan(15000 + 12000);
  });
});

describe("monthsBetween", () => {
  it("is ~12 across a year", () => {
    expect(monthsBetween(new Date("2024-01-01"), new Date("2025-01-01"))).toBeCloseTo(12, 1);
  });
});
