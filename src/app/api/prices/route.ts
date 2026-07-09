import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchLivePrices } from "@/lib/prices";

export const runtime = "nodejs";

const schema = z.object({
  items: z
    .array(z.object({ symbol: z.string().min(1).max(64), assetClass: z.string().min(1).max(32) }))
    .max(200),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
  const quotes = await fetchLivePrices(parsed.data.items);
  return NextResponse.json({ quotes });
}
