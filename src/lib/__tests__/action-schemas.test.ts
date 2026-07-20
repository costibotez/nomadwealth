import { describe, it, expect } from "vitest";
import {
  txnSchema,
  priceUpdateSchema,
  loanSchema,
  accountSchema,
  propertySchema,
  businessSchema,
  businessLedgerSchema,
  alertSchema,
  clientServiceSchema,
  dividendSchema,
} from "../action-schemas";

describe("txnSchema", () => {
  const base = {
    tradeDate: "2024-01-01",
    direction: "buy",
    assetClass: "us_stock",
    symbol: "AAPL",
    quantity: "2.5",
    unitCost: "100",
    currentPrice: "110",
  };

  it("coerces numeric strings from form inputs", () => {
    const v = txnSchema.parse(base);
    expect(v.quantity).toBe(2.5);
    expect(v.unitCost).toBe(100);
    expect(v.costCurrency).toBe("USD"); // default
  });

  it("turns empty-string commission/saleTax into null, not 0", () => {
    const v = txnSchema.parse({ ...base, commission: "", saleTax: "" });
    expect(v.commission).toBeNull();
    expect(v.saleTax).toBeNull();
  });

  it("keeps real commission values and defaults missing ones to null", () => {
    expect(txnSchema.parse({ ...base, commission: "1.5" }).commission).toBe(1.5);
    expect(txnSchema.parse(base).commission).toBeNull();
  });

  it("allows negative quantity (position adjustments) but rejects negative cost", () => {
    expect(txnSchema.parse({ ...base, quantity: "-1" }).quantity).toBe(-1);
    expect(() => txnSchema.parse({ ...base, unitCost: "-1" })).toThrow();
  });

  it("rejects a missing symbol with the field message", () => {
    expect(() => txnSchema.parse({ ...base, symbol: "" })).toThrow(/Symbol is required/);
  });
});

describe("priceUpdateSchema", () => {
  it("coerces prices and rejects negatives", () => {
    expect(
      priceUpdateSchema.parse([{ symbol: "X", assetClass: "crypto", currentPrice: "1.2" }])[0]
        .currentPrice,
    ).toBe(1.2);
    expect(() =>
      priceUpdateSchema.parse([{ symbol: "X", assetClass: "crypto", currentPrice: -1 }]),
    ).toThrow();
  });
});

describe("loanSchema", () => {
  it("accepts a minimal loan and defaults EUR", () => {
    const v = loanSchema.parse({
      borrower: "Dan",
      principal: "1000",
      backed: "none",
      interestRate: "10",
      compounding: "simple",
      status: "active",
    });
    expect(v.currency).toBe("EUR");
    expect(v.termMonths).toBeUndefined();
  });
});

describe("dividendSchema", () => {
  it("defaults legacy amountPerShare to 0 while requiring netAmount", () => {
    const v = dividendSchema.parse({
      symbol: "TLV",
      assetClass: "ro_stock",
      payDate: "2024-05-01",
      netAmount: "42.5",
      currency: "RON",
    });
    expect(v.netAmount).toBe(42.5);
    expect(v.amountPerShare).toBe(0);
  });
});

describe("accountSchema / propertySchema booleans", () => {
  it("defaults isCompany/isRented to false when omitted", () => {
    expect(
      accountSchema.parse({ name: "N26", type: "personal_cash", balance: "10", currency: "EUR" })
        .isCompany,
    ).toBe(false);
    expect(
      propertySchema.parse({ name: "Apt", value: "100", currency: "EUR", monthlyRent: "0" })
        .isRented,
    ).toBe(false);
  });
});

describe("businessSchema.valuation", () => {
  const base = { name: "Agency" };
  it("empty string -> null (form clears the field)", () => {
    expect(businessSchema.parse({ ...base, valuation: "" }).valuation).toBeNull();
  });
  it("numeric string -> number; missing -> null", () => {
    expect(businessSchema.parse({ ...base, valuation: "5000" }).valuation).toBe(5000);
    expect(businessSchema.parse(base).valuation).toBeNull();
  });
});

describe("businessLedgerSchema.month", () => {
  const base = { businessId: 1, year: 2024, kind: "revenue", amount: "10", currency: "EUR" };
  it("empty string -> null (yearly entry), in-range value passes, 13 rejected", () => {
    expect(businessLedgerSchema.parse({ ...base, month: "" }).month).toBeNull();
    expect(businessLedgerSchema.parse({ ...base, month: "12" }).month).toBe(12);
    expect(() => businessLedgerSchema.parse({ ...base, month: "13" })).toThrow();
  });
});

describe("alertSchema", () => {
  it("rejects a zero target price", () => {
    expect(() =>
      alertSchema.parse({ symbol: "BTC", assetClass: "crypto", targetPrice: "0", direction: "above" }),
    ).toThrow();
  });
});

describe("clientServiceSchema optional numerics", () => {
  const base = { clientId: 1, type: "hourly", currency: "EUR", cadence: "monthly" };
  it("empty strings for timesPerYear/hours/rate -> null", () => {
    const v = clientServiceSchema.parse({ ...base, timesPerYear: "", hours: "", rate: "" });
    expect(v.timesPerYear).toBeNull();
    expect(v.hours).toBeNull();
    expect(v.rate).toBeNull();
    expect(v.amount).toBe(0); // default
    expect(v.active).toBe(true); // default
  });
  it("keeps supplied values", () => {
    const v = clientServiceSchema.parse({ ...base, timesPerYear: "6", hours: "2.5", rate: "80" });
    expect(v.timesPerYear).toBe(6);
    expect(v.hours).toBe(2.5);
    expect(v.rate).toBe(80);
  });
});
