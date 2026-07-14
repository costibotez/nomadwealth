import { NextResponse } from "next/server";
import { z } from "zod";
import { runMigrations } from "@/lib/migrate-runtime";
import { resolveDatabaseUrl, isUnconfigured, verifySetupToken } from "@/lib/setup-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({ databaseUrl: z.string().optional() });

/** Runs pending migrations programmatically (no drizzle-kit). */
export async function POST(req: Request) {
  if (!(await isUnconfigured())) {
    return NextResponse.json({ error: "Already configured" }, { status: 403 });
  }
  if (!verifySetupToken(req)) {
    return NextResponse.json({ error: "Setup token required" }, { status: 403 });
  }
  const body = schema.safeParse(await req.json().catch(() => ({})));
  const url = resolveDatabaseUrl(body.success ? body.data.databaseUrl : undefined);
  if (!url) {
    return NextResponse.json(
      { ok: false, schemaVersion: "", error: "No DATABASE_URL available." },
      { status: 200 },
    );
  }
  const result = await runMigrations(url);
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
