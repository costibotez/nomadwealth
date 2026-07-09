import { getTransactions } from "@/db/queries";
import { TransactionsClient } from "@/components/transactions/TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const txns = await getTransactions();
  return <TransactionsClient txns={txns} />;
}
