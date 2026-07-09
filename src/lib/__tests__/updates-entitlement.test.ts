import { describe, it, expect } from "vitest";
import { updatesEntitlement } from "../updates-entitlement";

const NOW = new Date("2026-07-09T00:00:00.000Z");
const iso = (d: string) => new Date(d).toISOString();

describe("updatesEntitlement", () => {
  it("treats trial/none as N/A but still entitled", () => {
    expect(updatesEntitlement("trial", null, NOW)).toMatchObject({ state: "trial", entitled: true });
    expect(updatesEntitlement("none", null, NOW)).toMatchObject({ state: "trial", entitled: true });
  });

  it("treats a licensed row without an updates window as perpetual", () => {
    expect(updatesEntitlement("self-host", null, NOW)).toMatchObject({
      state: "perpetual",
      entitled: true,
      daysRemaining: null,
    });
  });

  it("is active when comfortably in the future", () => {
    const r = updatesEntitlement("updates", iso("2027-07-06T00:00:00Z"), NOW);
    expect(r.state).toBe("active");
    expect(r.entitled).toBe(true);
    expect(r.daysRemaining).toBeGreaterThan(30);
  });

  it("is expiring within the nudge window (still entitled)", () => {
    const r = updatesEntitlement("updates", iso("2026-07-29T00:00:00Z"), NOW);
    expect(r.state).toBe("expiring");
    expect(r.entitled).toBe(true);
    expect(r.daysRemaining).toBe(20);
  });

  it("is expired once the window has passed (not entitled)", () => {
    const r = updatesEntitlement("updates", iso("2026-06-09T00:00:00Z"), NOW);
    expect(r.state).toBe("expired");
    expect(r.entitled).toBe(false);
    expect(r.daysRemaining).toBeLessThan(0);
  });

  it("treats the boundary (today) as expired", () => {
    expect(updatesEntitlement("updates", NOW.toISOString(), NOW).state).toBe("expired");
  });

  it("falls back to perpetual on an unparseable date rather than false-expiring", () => {
    expect(updatesEntitlement("self-host", "not-a-date", NOW)).toMatchObject({
      state: "perpetual",
      entitled: true,
    });
  });
});
