import { describe, it, expect } from "vitest";
import {
  num,
  addDays,
  makeToEur,
  investmentsCostEur,
  investmentsMarketEur,
  loansOutstandingEur,
  propertiesValueEur,
  type TxnRow,
  type RealizedRow,
  type LoanRow,
  type LoanReceiptRow,
  type PropertyRow,
} from "../backfill-valuation";
import { FALLBACK_RATES } from "../../config/fx";

const eur = makeToEur({ EUR: 1, USD: 2, GBP: 1, RON: 5 }); // 1 EUR = 2 USD = 5 RON

function txn(over: Partial<TxnRow>): TxnRow {
  return {
    tradeDate: "2024-01-01",
    direction: "buy",
    quantity: "1",
    unitCost: "100",
    costCurrency: "EUR",
    currentPrice: "100",
    priceCurrency: "EUR",
    ...over,
  };
}

describe("num", () => {
  it("parses numeric strings and passes numbers through", () => {
    expect(num("12.5")).toBe(12.5);
    expect(num(3)).toBe(3);
  });
  it("coerces junk to 0", () => {
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
    expect(num("not a number")).toBe(0);
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2024-01-31", 1)).toBe("2024-02-01");
    expect(addDays("2024-12-31", 1)).toBe("2025-01-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29"); // leap year
  });
});

describe("makeToEur", () => {
  it("converts via EUR->X rate", () => {
    expect(eur(10, "USD")).toBe(5);
    expect(eur(10, "eur")).toBe(10); // case-insensitive
  });
  it("assumes EUR for unknown or zero-rated currencies", () => {
    expect(eur(10, "JPY")).toBe(10);
    expect(eur(10, "")).toBe(10);
    expect(makeToEur({ ...FALLBACK_RATES, USD: 0 })(10, "USD")).toBe(10);
  });
});

describe("investmentsCostEur", () => {
  it("sums cost of transactions traded on/before the day, sells subtract", () => {
    const txns = [
      txn({ tradeDate: "2024-01-01", quantity: "2", unitCost: "50" }), // 100
      txn({ tradeDate: "2024-02-01", quantity: "1", unitCost: "30", direction: "sell" }), // -30
      txn({ tradeDate: "2024-03-01", quantity: "1", unitCost: "999" }), // future — excluded
    ];
    expect(investmentsCostEur("2024-02-15", txns, [], eur)).toBe(70);
    expect(investmentsCostEur("2024-01-01", txns, [], eur)).toBe(100); // on the day counts
  });

  it("converts cost currency to EUR", () => {
    const txns = [txn({ quantity: "1", unitCost: "100", costCurrency: "USD" })];
    expect(investmentsCostEur("2024-06-01", txns, [], eur)).toBe(50);
  });

  it("includes realized trades only while open (openDate <= d < closeDate)", () => {
    const realized: RealizedRow[] = [
      { openDate: "2024-01-01", closeDate: "2024-06-01", cost: "40", currency: "EUR" },
    ];
    expect(investmentsCostEur("2023-12-31", [], realized, eur)).toBe(0); // before open
    expect(investmentsCostEur("2024-01-01", [], realized, eur)).toBe(40); // open day
    expect(investmentsCostEur("2024-05-31", [], realized, eur)).toBe(40); // still open
    expect(investmentsCostEur("2024-06-01", [], realized, eur)).toBe(0); // close day: gone
  });

  it("keeps a realized trade with no closeDate in the basis", () => {
    const realized: RealizedRow[] = [
      { openDate: "2024-01-01", closeDate: null, cost: "40", currency: "EUR" },
    ];
    expect(investmentsCostEur("2030-01-01", [], realized, eur)).toBe(40);
  });
});

describe("investmentsMarketEur", () => {
  it("values qty x currentPrice regardless of trade date, sells subtract", () => {
    const txns = [
      txn({ quantity: "2", currentPrice: "60" }), // 120
      txn({ quantity: "1", currentPrice: "20", direction: "sell" }), // -20
      txn({ quantity: "1", currentPrice: "100", priceCurrency: "USD" }), // 50
    ];
    expect(investmentsMarketEur(txns, eur)).toBe(150);
  });
});

describe("loansOutstandingEur", () => {
  const loan: LoanRow = {
    id: 1,
    startDate: "2024-01-01",
    principal: "1200",
    interestRate: "10",
    termMonths: null,
    compounding: "simple",
    currency: "EUR",
  };

  it("is zero before the loan starts", () => {
    expect(loansOutstandingEur("2023-12-31", [loan], [], eur)).toBe(0);
  });

  it("values principal + simple interest accrued to the day", () => {
    // 12 months elapsed: 1200 * 10% * 1y = 120 interest
    expect(loansOutstandingEur("2025-01-01", [loan], [], eur)).toBeCloseTo(1320, 6);
  });

  it("nets receipts received on/before the day", () => {
    const receipts: LoanReceiptRow[] = [
      { loanId: 1, receivedOn: "2024-06-01", amount: "200", kind: "principal" },
      { loanId: 1, receivedOn: "2024-07-01", amount: "50", kind: "interest" },
      { loanId: 1, receivedOn: "2026-01-01", amount: "999", kind: "principal" }, // future — ignored
      { loanId: 2, receivedOn: "2024-06-01", amount: "999", kind: "principal" }, // other loan
    ];
    // principal 1200-200=1000, interest 120-50=70
    expect(loansOutstandingEur("2025-01-01", [loan], receipts, eur)).toBeCloseTo(1070, 6);
  });

  it("caps accrued interest at the term", () => {
    const capped = { ...loan, termMonths: 6 }; // 1200 * 10% * 0.5y = 60
    expect(loansOutstandingEur("2026-01-01", [capped], [], eur)).toBeCloseTo(1260, 6);
  });

  it("converts the outstanding amount to EUR", () => {
    const usd = { ...loan, currency: "USD" };
    expect(loansOutstandingEur("2025-01-01", [usd], [], eur)).toBeCloseTo(660, 6);
  });
});

describe("propertiesValueEur", () => {
  const TODAY = "2024-01-11";
  const prop: PropertyRow = {
    id: 1,
    purchaseDate: "2024-01-01",
    purchasePrice: "100",
    value: "200",
    saleDate: null,
    salePrice: null,
    status: "active",
    currency: "EUR",
  };

  it("interpolates purchase price to today's value and lands on value today", () => {
    expect(propertiesValueEur("2024-01-06", TODAY, [prop], [], "2024-01-01", eur)).toBe(150);
    expect(propertiesValueEur(TODAY, TODAY, [prop], [], "2024-01-01", eur)).toBe(200);
  });

  it("excludes properties not yet acquired or already sold", () => {
    expect(propertiesValueEur("2023-12-31", TODAY, [prop], [], "2023-01-01", eur)).toBe(0);
    const sold = { ...prop, saleDate: "2024-01-05", salePrice: "180" };
    expect(propertiesValueEur("2024-01-05", TODAY, [sold], [], "2024-01-01", eur)).toBe(0);
    const soldUndated = { ...prop, status: "sold" };
    expect(propertiesValueEur("2024-01-06", TODAY, [soldUndated], [], "2024-01-01", eur)).toBe(0);
  });

  it("holds value flat when there is no purchase basis", () => {
    const flat = { ...prop, purchaseDate: null, purchasePrice: null };
    expect(propertiesValueEur("2024-01-02", TODAY, [flat], [], "2024-01-01", eur)).toBe(200);
  });

  it("derives acquisition from the first dated ledger entry when purchaseDate is null", () => {
    const flat = { ...prop, purchaseDate: null, purchasePrice: null };
    const ledger = [
      { propertyId: 1, occurredOn: "2024-01-05" },
      { propertyId: 1, occurredOn: "2024-01-03" },
      { propertyId: 2, occurredOn: "2023-01-01" }, // other property
    ];
    expect(propertiesValueEur("2024-01-02", TODAY, [flat], ledger, "2020-01-01", eur)).toBe(0);
    expect(propertiesValueEur("2024-01-03", TODAY, [flat], ledger, "2020-01-01", eur)).toBe(200);
  });

  it("converts native value to EUR", () => {
    const usd = { ...prop, purchaseDate: null, purchasePrice: null, currency: "USD" };
    expect(propertiesValueEur("2024-01-02", TODAY, [usd], [], "2024-01-01", eur)).toBe(100);
  });
});
