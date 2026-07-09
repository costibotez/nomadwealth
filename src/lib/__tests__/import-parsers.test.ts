import { describe, it, expect } from "vitest";
import {
  mapAssetClass,
  toISODate,
  num,
  parseHoldings,
  parsePastTrades,
  parseCashflowSheet,
  parseDanSchedule,
  monthNameToNum,
  normCurrency,
  categorizeExpense,
  type Row,
} from "@/lib/import-parsers";

describe("mapAssetClass", () => {
  it("maps spreadsheet labels to enums", () => {
    expect(mapAssetClass("RO Stock")).toBe("ro_stock");
    expect(mapAssetClass("Stock")).toBe("us_stock");
    expect(mapAssetClass("Crypto")).toBe("crypto");
    expect(mapAssetClass("Crowdfunding REIT")).toBe("reit");
    expect(mapAssetClass("Mutual Fund")).toBe("mutual_fund");
    expect(mapAssetClass("Commodity")).toBe("gold");
    expect(mapAssetClass("???")).toBe("other");
  });
});

describe("toISODate", () => {
  it("handles Excel serials, Dates and dd/mm/yyyy", () => {
    expect(toISODate(new Date("2024-07-01T00:00:00Z"))).toBe("2024-07-01");
    expect(toISODate("28/6/2026")).toBe("2026-06-28");
    expect(toISODate(45474)).toMatch(/^202\d-\d\d-\d\d$/);
    expect(toISODate("garbage")).toBeNull();
  });
});

describe("num", () => {
  it("coerces and tolerates junk like #DIV/0!", () => {
    expect(num(12.5)).toBe(12.5);
    expect(num("1,234.5")).toBe(1234.5);
    expect(num("#DIV/0!")).toBe(0);
    expect(num(null)).toBe(0);
  });
});

describe("parseHoldings", () => {
  it("parses rows with swapped Investment Type/Trade Type columns", () => {
    const rows: Row[] = [
      ["Date", "Investment Type", "Trade Type", "Symbol", "Quantity", "Token Price ($)", "Money Invested ($)", "Current Price ($)"],
      [new Date("2024-07-01"), "Buy", "RO Stock", "BVB:TLV", 250, 7, 1750, 8.28],
      // bonus shares: zero cost
      [new Date("2024-07-22"), "Buy", "RO Stock", "BVB:TLV", 37, 0, 0, 8.28],
      // summary junk row — no direction/symbol, must be skipped
      [null, null, null, null, "Total Invested", 62797, null, null],
    ];
    const { transactions } = parseHoldings(rows);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      direction: "buy",
      assetClass: "ro_stock",
      symbol: "BVB:TLV",
      quantity: 250,
      unitCost: 7,
      currentPrice: 8.28,
    });
    expect(transactions[1].unitCost).toBe(0);
  });
});

describe("parsePastTrades", () => {
  it("detects offset header and parses realized trades", () => {
    const rows: Row[] = [
      ["Past Stock Trades"],
      ["Open Date", "Close Date", "Investment Type", "Trade Type", "Symbol", "Quantity", "Open ($)", "Money Invested ($)", "Close ($)", "End Value ($)", "Returns ($)"],
      [new Date("2024-03-22"), new Date("2024-05-14"), "Sell", "Stock", "RDDT", 17.88, 49.43, 884, 58.28, 1042, 158],
    ];
    const out = parsePastTrades(rows);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ symbol: "RDDT", assetClass: "us_stock", cost: 884, proceeds: 1042, pl: 158 });
  });
});

describe("parseCashflowSheet", () => {
  it("carries month down and skips Total subtotal rows", () => {
    const rows: Row[] = [
      [null, "Luna", "Client", "Suma", "Valuta initiala", "Suma finala (GBP)"],
      [null, "Ian", "IG Retainer", 225, "GBP", 225],
      [null, null, "Mobifootball", 2500, "EUR", 2150],
      [null, "Total Ian", null, null, null, 9845],
      [null, "Feb", "POMS Retainer", 500, "GBP", 500],
    ];
    const out = parseCashflowSheet(rows);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ month: 1, label: "IG Retainer", amountGbp: 225 });
    expect(out[1].currency).toBe("EUR");
    expect(out[2]).toMatchObject({ month: 2, label: "POMS Retainer" });
  });
});

describe("parseDanSchedule", () => {
  it("expands An/Luna with carried year", () => {
    const rows: Row[] = [
      [null, "An", "Luna", "Suma", "Valuta"],
      [null, 2024, "Decembrie", 1850, "RON"],
      [null, null, "Ianuarie", 1850, "RON"],
    ];
    const out = parseDanSchedule(rows);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ dueDate: "2024-12-01", amount: 1850, currency: "RON" });
    expect(out[1].dueDate).toBe("2024-01-01");
  });
});

describe("helpers", () => {
  it("monthNameToNum + normCurrency + categorizeExpense", () => {
    expect(monthNameToNum("Ian")).toBe(1);
    expect(monthNameToNum("Dec")).toBe(12);
    expect(normCurrency("EURO")).toBe("EUR");
    expect(categorizeExpense("Contabilitate")).toBe("Accounting & Legal");
    expect(categorizeExpense("Netflix")).toBe("Subscriptions & Tooling");
  });
});
