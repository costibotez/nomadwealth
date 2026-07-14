import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-actions";
import { clearSampleData, loadSampleData } from "@/lib/sample-data";

export const runtime = "nodejs";

/** Owner-only: seed the onboarding sample portfolio into the user's own DB. */
export async function POST() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { inserted } = await loadSampleData();
    return NextResponse.json({ ok: true, inserted });
  } catch (err) {
    console.error("sample data load failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not load sample data." },
      { status: 500 },
    );
  }
}

/** Owner-only: remove exactly the rows the sample seed inserted. */
export async function DELETE() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { removed } = await clearSampleData();
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    console.error("sample data clear failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not clear sample data." },
      { status: 500 },
    );
  }
}
