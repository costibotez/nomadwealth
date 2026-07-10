import { ClientsClient } from "@/components/clients/ClientsClient";
import { DEMO_CLIENTS } from "@/lib/demo-fixtures";

// ClientsClient hides its add/edit/delete controls under the /demo layout's
// ReadonlyProvider, so this renders as a static read-only walkthrough.
export default function DemoClientsPage() {
  return <ClientsClient model={DEMO_CLIENTS} />;
}
