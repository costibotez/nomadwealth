import { ProjectionClient } from "@/components/projection/ProjectionClient";
import { DEMO_NET_WORTH as m } from "@/lib/demo-fixtures";

// FIRE / Projection is a pure client-side calculator seeded from the demo net
// worth — no DB, so it works verbatim on the public /demo route.
export default function DemoProjectionPage() {
  const financial =
    m.components.investmentsEur + m.components.accountsEur + m.components.loansEur;
  return (
    <ProjectionClient
      startFinancialEur={financial}
      startPropertyEur={m.components.propertiesEur}
      baseYear={2026}
    />
  );
}
