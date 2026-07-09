import { NextResponse } from "next/server";
import { getFxRates, type FxData } from "@/lib/fx-server";

export const runtime = "nodejs";
export type FxResponse = FxData;

export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  const data = await getFxRates(force);
  return NextResponse.json(data);
}
