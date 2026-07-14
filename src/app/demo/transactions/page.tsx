import type { Metadata } from "next";

export const metadata: Metadata = { title: "Demo · Transactions" };

import { TransactionsClient } from "@/components/transactions/TransactionsClient";
import { DEMO_TRANSACTIONS } from "@/lib/demo-fixtures";

export default function DemoTransactionsPage() {
  return <TransactionsClient txns={DEMO_TRANSACTIONS} />;
}
