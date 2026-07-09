import { getNetWorthModel } from "@/lib/aggregate";
import { ProjectionClient } from "@/components/projection/ProjectionClient";

export const dynamic = "force-dynamic";

export default async function ProjectionPage() {
  const m = await getNetWorthModel();
  const financial = m.components.investmentsEur + m.components.accountsEur + m.components.loansEur;
  return (
    <ProjectionClient
      startFinancialEur={financial}
      startPropertyEur={m.components.propertiesEur}
      baseYear={new Date().getFullYear()}
    />
  );
}
