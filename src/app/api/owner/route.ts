import { NextResponse } from "next/server";
import { z } from "zod";
import { setOwner, getOwner } from "@/lib/owner";
import { isUnconfigured, verifySetupToken } from "@/lib/setup-guard";

export const runtime = "nodejs";

const schema = z.object({
  password: z.string().min(8, "Use at least 8 characters").max(512),
  email: z.string().email().optional().or(z.literal("")),
});

/** First-run only: create the single owner account (hashed password). */
export async function POST(req: Request) {
  if (!(await isUnconfigured())) {
    return NextResponse.json({ ok: false, error: "Already configured" }, { status: 403 });
  }
  if (!verifySetupToken(req)) {
    return NextResponse.json({ ok: false, error: "Setup token required" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  // Guard against racing a second owner in during setup.
  if (await getOwner()) {
    return NextResponse.json({ ok: false, error: "Owner already exists" }, { status: 409 });
  }

  try {
    await setOwner(parsed.data.password, parsed.data.email || undefined);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("owner create failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not save the owner account. Run the database step first." },
      { status: 200 },
    );
  }
}
