import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { netWorthChange } from "@/lib/networth-change";

const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString().slice(0, 10);

describe("netWorthChange", () => {
  beforeEach(() => {
    // Pin "now" so the 30-day window is deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("returns null with no history", () => {
    expect(netWorthChange([], 100_000)).toBeNull();
  });

  it("returns null when the only snapshot is today", () => {
    expect(netWorthChange([{ date: iso(0), totalEur: 100_000 }], 100_000)).toBeNull();
  });

  it("uses the ~30-day-old baseline when history spans the window", () => {
    const history = [
      { date: iso(60 * DAY), totalEur: 90_000 },
      { date: iso(31 * DAY), totalEur: 95_000 }, // just past the cutoff → baseline
      { date: iso(5 * DAY), totalEur: 99_000 },
    ];
    const c = netWorthChange(history, 100_000)!;
    expect(c.label).toBe("past 30 days");
    expect(c.eur).toBe(5_000);
    expect(c.pct).toBeCloseTo(5_000 / 95_000);
  });

  it("falls back to the earliest snapshot when all history is inside the window", () => {
    const history = [
      { date: iso(10 * DAY), totalEur: 80_000 },
      { date: iso(3 * DAY), totalEur: 82_000 },
    ];
    const c = netWorthChange(history, 84_000)!;
    expect(c.label).toMatch(/^since /);
    expect(c.eur).toBe(4_000); // vs earliest (80k)
  });

  it("reports a negative change", () => {
    const history = [{ date: iso(40 * DAY), totalEur: 120_000 }];
    const c = netWorthChange(history, 108_000)!;
    expect(c.eur).toBe(-12_000);
    expect(c.pct).toBeCloseTo(-0.1);
  });
});
