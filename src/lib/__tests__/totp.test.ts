import { describe, it, expect } from "vitest";
import {
  base32Encode,
  base32Decode,
  generateSecret,
  generateTOTP,
  verifyTOTP,
  otpauthURL,
} from "@/lib/totp";

// RFC 6238 Appendix B test vectors use the ASCII seed "12345678901234567890"
// (20 bytes) with HMAC-SHA1 and a 30-second step.
const RFC_SEED_ASCII = "12345678901234567890";
const RFC_SEED_B32 = base32Encode(new TextEncoder().encode(RFC_SEED_ASCII));

describe("base32", () => {
  it("encodes the RFC seed to the well-known value", () => {
    expect(RFC_SEED_B32).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  });

  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 128, 64, 33, 7]);
    expect(Array.from(base32Decode(base32Encode(bytes)))).toEqual(
      Array.from(bytes),
    );
  });

  it("decodes case-insensitively and ignores spaces", () => {
    expect(Array.from(base32Decode("gezd gnbv"))).toEqual(
      Array.from(base32Decode("GEZDGNBV")),
    );
  });
});

describe("generateTOTP — RFC 6238 vectors (SHA-1, 8 digits)", () => {
  const cases: [number, string][] = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
  ];
  for (const [tSeconds, expected] of cases) {
    it(`T=${tSeconds} → ${expected}`, async () => {
      const code = await generateTOTP(RFC_SEED_B32, tSeconds * 1000, 30, 8);
      expect(code).toBe(expected);
    });
  }

  it("matches the 6-digit truncation at T=59", async () => {
    const code = await generateTOTP(RFC_SEED_B32, 59 * 1000);
    expect(code).toBe("287082");
  });
});

describe("verifyTOTP", () => {
  it("accepts the correct current code", async () => {
    const now = 59 * 1000;
    expect(await verifyTOTP(RFC_SEED_B32, "287082", 1, now)).toBe(true);
  });

  it("rejects a wrong code", async () => {
    const now = 59 * 1000;
    expect(await verifyTOTP(RFC_SEED_B32, "000000", 1, now)).toBe(false);
  });

  it("tolerates ±1 step of clock skew", async () => {
    // Code valid at T=59 (step 1) is still accepted 30s later (step 2) with window=1.
    expect(await verifyTOTP(RFC_SEED_B32, "287082", 1, (59 + 30) * 1000)).toBe(true);
    // …but not two steps away.
    expect(await verifyTOTP(RFC_SEED_B32, "287082", 1, (59 + 90) * 1000)).toBe(false);
  });

  it("rejects malformed input without throwing", async () => {
    expect(await verifyTOTP(RFC_SEED_B32, "abc", 1, 59000)).toBe(false);
    expect(await verifyTOTP(RFC_SEED_B32, "12345", 1, 59000)).toBe(false);
    expect(await verifyTOTP(RFC_SEED_B32, "", 1, 59000)).toBe(false);
  });
});

describe("generateSecret / otpauthURL", () => {
  it("generates a decodable 32-char base32 secret", () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(secret).length).toBe(20);
  });

  it("builds a scannable otpauth URI", () => {
    const url = otpauthURL("ABCDEF", "me@example.com");
    expect(url).toContain("otpauth://totp/NomadWealth:me%40example.com");
    expect(url).toContain("secret=ABCDEF");
    expect(url).toContain("issuer=NomadWealth");
    expect(url).toContain("algorithm=SHA1");
    expect(url).toContain("digits=6");
    expect(url).toContain("period=30");
  });
});
