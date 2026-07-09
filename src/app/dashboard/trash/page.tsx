import { getTrash } from "@/db/queries";
import { TrashClient, type TrashItem } from "@/components/trash/TrashClient";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const t = await getTrash();
  const items: TrashItem[] = [
    ...t.transactions.map((r) => ({ entity: "transaction" as const, id: r.id, label: `${r.symbol} (${r.assetClass})`, deletedAt: r.deletedAt?.toISOString() ?? null })),
    ...t.loans.map((r) => ({ entity: "loan" as const, id: r.id, label: `Loan — ${r.borrower}`, deletedAt: r.deletedAt?.toISOString() ?? null })),
    ...t.accounts.map((r) => ({ entity: "account" as const, id: r.id, label: `Account — ${r.name}`, deletedAt: r.deletedAt?.toISOString() ?? null })),
    ...t.properties.map((r) => ({ entity: "property" as const, id: r.id, label: `Property — ${r.name}`, deletedAt: r.deletedAt?.toISOString() ?? null })),
    ...t.loanPayments.map((r) => ({ entity: "loan_payment" as const, id: r.id, label: `Payment ${r.dueDate}`, deletedAt: r.deletedAt?.toISOString() ?? null })),
  ];
  return <TrashClient items={items} />;
}
