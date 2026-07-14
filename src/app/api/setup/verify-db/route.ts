import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyConnection } from "@/lib/migrate-runtime";
import { resolveDatabaseUrl, isUnconfigured, verifySetupToken } from "@/lib/setup-guard";

export const runtime = "nodejs";

const schema = z.object({ databaseUrl: z.string().optional() });

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
      {
        connected: false,
        databaseUrlPresent: false,
        error: "No DATABASE_URL. Add it in Vercel → Storage (Neon) or paste one.",
      },
      { status: 200 },
    );
  }
  const result = await verifyConnection(url);
  return NextResponse.json({ ...result, databaseUrlPresent: true });
}
