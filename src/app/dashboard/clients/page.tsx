import { getClientsModel } from "@/lib/page-data";
import { ClientsClient } from "@/components/clients/ClientsClient";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const model = await getClientsModel();
  return <ClientsClient model={model} />;
}
