import { NextResponse } from "next/server";
import { getUnacknowledgedAlerts, getUpcomingLoanPayments } from "@/db/queries";
import { requireSession } from "@/lib/auth-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Returns alert/loan details — must not rely on middleware alone for auth.
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [alerts, loanDue] = await Promise.all([
    getUnacknowledgedAlerts(),
    getUpcomingLoanPayments(14),
  ]);
  return NextResponse.json({
    count: alerts.length + loanDue.length,
    priceCount: alerts.length,
    loanCount: loanDue.length,
    alerts: alerts.map((a) => ({ symbol: a.symbol, direction: a.direction, targetPrice: a.targetPrice, triggeredPrice: a.triggeredPrice })),
    loanDue: loanDue.map((l) => ({ borrower: l.borrower, amount: l.amount, currency: l.currency, dueDate: l.dueDate, daysUntil: l.daysUntil, overdue: l.overdue })),
  });
}
