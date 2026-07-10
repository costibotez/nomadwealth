import { describe, it, expect } from "vitest";
import {
  verifyLicenseKey,
  licenseAllowsSetupCompletion,
  type LicenseResult,
} from "../license";

// NOTE: we deliberately do NOT embed a real vendor-signed key here — this file
// is public, and a valid key would let anyone pass the very gate it protects.
// "Valid key passes" is covered via the pure decision below; the crypto paths
// are exercised only for the BLOCKED cases (which need no valid key).

describe("licenseAllowsSetupCompletion (the free-deploy gate)", () => {
  const r = (over: Partial<LicenseResult>): LicenseResult => ({ valid: true, tier: "self-host", ...over });

  it("allows purchased tiers", () => {
    expect(licenseAllowsSetupCompletion(r({ tier: "self-host" }))).toBe(true);
    expect(licenseAllowsSetupCompletion(r({ tier: "updates" }))).toBe(true);
  });
  it("blocks trial", () => {
    expect(licenseAllowsSetupCompletion(r({ tier: "trial" }))).toBe(false);
  });
  it("blocks invalid (even if a tier leaks through)", () => {
    expect(licenseAllowsSetupCompletion(r({ valid: false, tier: "self-host" }))).toBe(false);
    expect(licenseAllowsSetupCompletion(r({ valid: false, tier: "trial" }))).toBe(false);
  });
});

describe("verifyLicenseKey → gate (real crypto, freeload paths blocked)", () => {
  it("blocks an EMPTY key (the freeload path) — verifies as trial", async () => {
    const res = await verifyLicenseKey("");
    expect(res.tier).toBe("trial");
    expect(licenseAllowsSetupCompletion(res)).toBe(false);
  });
  it("blocks an explicit NW-TRIAL key", async () => {
    expect(licenseAllowsSetupCompletion(await verifyLicenseKey("NW-TRIAL-abc"))).toBe(false);
  });
  it("blocks a garbage / forged key (bad signature)", async () => {
    const res = await verifyLicenseKey("NW1.Zm9v.YmFy");
    expect(res.valid).toBe(false);
    expect(licenseAllowsSetupCompletion(res)).toBe(false);
  });
});
