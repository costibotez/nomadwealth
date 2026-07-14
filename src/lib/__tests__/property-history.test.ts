import { describe, it, expect } from "vitest";
import { propertyValueAt, type PropertyValuationInput } from "@/lib/property-history";

const TODAY = "2026-07-12";
const base: PropertyValuationInput = {
  purchaseDate: "2020-07-12", // 6 years ago
  purchasePrice: 100_000,
  value: 160_000,
  saleDate: null,
  salePrice: null,
};

describe("propertyValueAt", () => {
  it("equals purchasePrice on the purchase day", () => {
    expect(propertyValueAt(base, base.purchaseDate!, TODAY)).toBe(100_000);
  });

  it("equals current value today (parity with the live snapshot)", () => {
    expect(propertyValueAt(base, TODAY, TODAY)).toBe(160_000);
  });

  it("interpolates linearly at the midpoint", () => {
    // 3 years into a 6-year span → ~halfway between 100k and 160k (±leap days).
    expect(propertyValueAt(base, "2023-07-12", TODAY)).toBeCloseTo(130_000, -2);
  });

  it("holds flat at current value when there's no purchase basis", () => {
    const noBasis = { ...base, purchaseDate: null, purchasePrice: null };
    expect(propertyValueAt(noBasis, "2023-07-12", TODAY)).toBe(160_000);
    const noPrice = { ...base, purchasePrice: null };
    expect(propertyValueAt(noPrice, "2023-07-12", TODAY)).toBe(160_000);
  });

  it("interpolates toward salePrice up to the sale date", () => {
    const sold = { ...base, saleDate: "2026-07-12", salePrice: 200_000 };
    // purchase→sale spans 6 years; midpoint → ~halfway between 100k and 200k.
    expect(propertyValueAt(sold, "2023-07-12", TODAY)).toBeCloseTo(150_000, -2);
    expect(propertyValueAt(sold, "2026-07-12", TODAY)).toBe(200_000);
  });

  it("clamps before purchase and after the endpoint", () => {
    expect(propertyValueAt(base, "2019-01-01", TODAY)).toBe(100_000); // before → floor
    const sold = { ...base, saleDate: "2024-07-12", salePrice: 180_000 };
    expect(propertyValueAt(sold, "2025-01-01", TODAY)).toBe(180_000); // past sale → cap
  });

  it("returns the endpoint on a same-day purchase/sale (no divide-by-zero)", () => {
    const sameDay = { ...base, saleDate: base.purchaseDate, salePrice: 120_000 };
    expect(propertyValueAt(sameDay, base.purchaseDate!, TODAY)).toBe(120_000);
  });
});
