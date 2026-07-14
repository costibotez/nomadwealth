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
//
// Policy: any cryptographically VALID result — including trial/empty keys —
// may finish setup (trial installs show the upgrade banner instead of being
// hard-blocked mid-onboarding). Only forged/broken keys are rejected.

describe("licenseAllowsSetupCompletion (the setup gate)", () => {
  const r = (over: Partial<LicenseResult>): LicenseResult => ({ valid: true, tier: "self-host", ...over });

  it("allows purchased tiers", () => {
    expect(licenseAllowsSetupCompletion(r({ tier: "self-host" }))).toBe(true);
    expect(licenseAllowsSetupCompletion(r({ tier: "updates" }))).toBe(true);
  });
  it("allows trial (no hard block mid-onboarding)", () => {
    expect(licenseAllowsSetupCompletion(r({ tier: "trial" }))).toBe(true);
  });
  it("blocks invalid (even if a tier leaks through)", () => {
    expect(licenseAllowsSetupCompletion(r({ valid: false, tier: "self-host" }))).toBe(false);
    expect(licenseAllowsSetupCompletion(r({ valid: false, tier: "trial" }))).toBe(false);
  });
});

describe("verifyLicenseKey → gate (real crypto)", () => {
  it("an EMPTY key verifies as trial and may finish setup", async () => {
    const res = await verifyLicenseKey("");
    expect(res.tier).toBe("trial");
    expect(licenseAllowsSetupCompletion(res)).toBe(true);
  });
  it("an explicit NW-TRIAL key verifies as trial and may finish setup", async () => {
    const res = await verifyLicenseKey("NW-TRIAL-abc");
    expect(res.tier).toBe("trial");
    expect(licenseAllowsSetupCompletion(res)).toBe(true);
  });
  it("blocks a garbage / forged key (bad signature)", async () => {
    const res = await verifyLicenseKey("NW1.Zm9v.YmFy");
    expect(res.valid).toBe(false);
    expect(licenseAllowsSetupCompletion(res)).toBe(false);
  });
});
