import { describe, it, expect } from "vitest";
import { isAuthorizedCronHeader, cronAuthorized } from "../cron-auth";

describe("isAuthorizedCronHeader", () => {
  it("accepts an exact Bearer match", () => {
    expect(isAuthorizedCronHeader("Bearer s3cret", "s3cret")).toBe(true);
  });

  it("fails closed when the secret is unset (empty)", () => {
    expect(isAuthorizedCronHeader("Bearer ", "")).toBe(false);
    expect(isAuthorizedCronHeader(null, "")).toBe(false);
    expect(isAuthorizedCronHeader("Bearer undefined", "")).toBe(false);
  });

  it("rejects a missing, malformed, or wrong header", () => {
    expect(isAuthorizedCronHeader(null, "s3cret")).toBe(false);
    expect(isAuthorizedCronHeader("s3cret", "s3cret")).toBe(false); // no Bearer prefix
    expect(isAuthorizedCronHeader("bearer s3cret", "s3cret")).toBe(false); // case-sensitive
    expect(isAuthorizedCronHeader("Bearer wrong", "s3cret")).toBe(false);
    expect(isAuthorizedCronHeader("Bearer s3cret ", "s3cret")).toBe(false); // trailing space
  });
});

describe("cronAuthorized (reads env.CRON_SECRET)", () => {
  it("authorizes a request only with the matching Bearer header", () => {
    const prev = process.env.CRON_SECRET;
    try {
      process.env.CRON_SECRET = "test-secret";
      const ok = new Request("http://localhost/api/cron/refresh-prices", {
        headers: { authorization: "Bearer test-secret" },
      });
      const bad = new Request("http://localhost/api/cron/refresh-prices");
      expect(cronAuthorized(ok)).toBe(true);
      expect(cronAuthorized(bad)).toBe(false);

      delete process.env.CRON_SECRET; // unset -> fail closed even with a header
      expect(cronAuthorized(ok)).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = prev;
    }
  });
});
