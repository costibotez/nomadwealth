import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { importJobs } from "@/db/schema";
import { requireSession } from "@/lib/auth-actions";
import { commitImport, type ImportAssetClass } from "@/lib/import-commit";

export const runtime = "nodejs";

const schema = z.object({ rows: z.array(z.record(z.unknown())).max(100_000) });

/** Idempotently commits a pending import job's rows into the domain tables. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  await requireSession();
  const { jobId } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [job] = await db.select().from(importJobs).where(eq(importJobs.id, jobId));
  if (!job) {
    return NextResponse.json({ error: "Import job not found" }, { status: 404 });
  }
  if (job.status === "committed") {
    // Idempotent: don't double-insert if the client retries.
    return NextResponse.json({ committed: job.rowCount ?? 0, alreadyCommitted: true });
  }

  try {
    const committed = await commitImport(
      job.assetClass as ImportAssetClass,
      parsed.data.rows,
    );
    await db
      .update(importJobs)
      .set({ status: "committed", rowCount: committed })
      .where(eq(importJobs.id, jobId));
    return NextResponse.json({ committed });
  } catch (err) {
    await db
      .update(importJobs)
      .set({ status: "failed" })
      .where(eq(importJobs.id, jobId));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
