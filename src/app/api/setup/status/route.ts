import { NextResponse } from "next/server";
import { getSetupState } from "@/lib/setup-state";
import { maskDatabaseUrl, setupTokenRequired } from "@/lib/setup-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** First-run status for the wizard: is the DB URL present, is setup done. */
export async function GET() {
  const state = await getSetupState();
  return NextResponse.json({
    configured: state.configured,
    hasDatabaseUrl: state.hasDatabaseUrl,
    databaseHint: maskDatabaseUrl(process.env.DATABASE_URL),
    // Surfaced up-front so the wizard can flag a missing secret in step 0
    // instead of failing at the very last "finish" click.
    hasSessionSecret: Boolean(process.env.SESSION_SECRET),
    setupTokenRequired: setupTokenRequired(),
  });
}
