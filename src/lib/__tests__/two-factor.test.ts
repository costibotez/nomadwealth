import { describe, it, expect } from "vitest";
import {
  generateBackupCodes,
  hashBackupCodes,
  consumeBackupCode,
  normalizeBackupCode,
  verifySecondFactor,
} from "@/lib/two-factor";
import { base32Encode, generateTOTP } from "@/lib/totp";

const SEED_B32 = base32Encode(new TextEncoder().encode("12345678901234567890"));

describe("generateBackupCodes", () => {
  it("makes 10 unique, readable, formatted codes", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) {
      expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      // No ambiguous characters.
      expect(c).not.toMatch(/[01OIL]/);
    }
  });
});

describe("backup code hashing + consumption", () => {
  it("hashes to the PBKDF2 format and does not store plaintext", async () => {
    const [hash] = await hashBackupCodes(["ABCD-EFGH"]);
    expect(hash.startsWith("pbkdf2$")).toBe(true);
    expect(hash).not.toContain("ABCD");
  });

  it("consumes a valid code and removes exactly it", async () => {
    const codes = ["ABCD-EFGH", "JKMN-PQRS", "TUVW-XYZ2"];
    const hashes = await hashBackupCodes(codes);
    const res = await consumeBackupCode("JKMN-PQRS", hashes);
    expect(res.ok).toBe(true);
    expect(res.remaining).toHaveLength(2);
    // The consumed code can no longer be used against the remaining set.
    const reuse = await consumeBackupCode("JKMN-PQRS", res.remaining);
    expect(reuse.ok).toBe(false);
  });

  it("matches regardless of case, spaces, or dashes", async () => {
    const hashes = await hashBackupCodes(["ABCD-EFGH"]);
    expect((await consumeBackupCode("abcd efgh", hashes)).ok).toBe(true);
    expect(normalizeBackupCode("abcd-efgh")).toBe("ABCDEFGH");
  });

  it("rejects an unknown code and preserves the set", async () => {
    const hashes = await hashBackupCodes(["ABCD-EFGH"]);
    const res = await consumeBackupCode("ZZZZ-ZZZZ", hashes);
    expect(res.ok).toBe(false);
    expect(res.remaining).toHaveLength(1);
  });

  it("handles a null/empty stored set", async () => {
    expect((await consumeBackupCode("ABCD-EFGH", null)).ok).toBe(false);
    expect((await consumeBackupCode("ABCD-EFGH", [])).ok).toBe(false);
  });
});

describe("verifySecondFactor", () => {
  it("accepts a live TOTP code and does not consume backup codes", async () => {
    const hashes = await hashBackupCodes(["ABCD-EFGH"]);
    const code = await generateTOTP(SEED_B32);
    const res = await verifySecondFactor(
      { totpSecret: SEED_B32, backupCodes: hashes },
      code,
    );
    expect(res.ok).toBe(true);
    expect(res.consumedBackupCodes).toBeUndefined();
  });

  it("falls back to a backup code and reports the shortened set", async () => {
    const hashes = await hashBackupCodes(["ABCD-EFGH", "JKMN-PQRS"]);
    const res = await verifySecondFactor(
      { totpSecret: SEED_B32, backupCodes: hashes },
      "ABCD-EFGH",
    );
    expect(res.ok).toBe(true);
    expect(res.consumedBackupCodes).toHaveLength(1);
  });

  it("rejects an invalid factor", async () => {
    const res = await verifySecondFactor(
      { totpSecret: SEED_B32, backupCodes: [] },
      "000000",
    );
    expect(res.ok).toBe(false);
  });
});
