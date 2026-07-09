import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { importJobs } from "@/db/schema";
import { requireSession } from "@/lib/auth-actions";
import { IMPORT_ASSET_CLASSES } from "@/lib/import-commit";

export const runtime = "nodejs";

const schema = z.object({
  assetClass: z.string(),
  rows: z.array(z.record(z.unknown())).max(100_000),
});

/** Creates an import job and echoes a small preview. Commit happens separately. */
export async function POST(req: Request) {
  await requireSession();

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { assetClass, rows } = parsed.data;
  if (!IMPORT_ASSET_CLASSES.some((a) => a.value === assetClass)) {
    return NextResponse.json({ error: "Unknown asset class" }, { status: 400 });
  }

  const [job] = await db
    .insert(importJobs)
    .values({ assetClass, status: "pending", rowCount: rows.length })
    .returning({ id: importJobs.id });

  return NextResponse.json({
    jobId: job.id,
    rowCount: rows.length,
    previewRows: rows.slice(0, 20),
  });
}
