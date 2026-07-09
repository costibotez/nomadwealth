import { getDividendModel } from "@/lib/page-data";
import { DividendsClient } from "@/components/dividends/DividendsClient";

export const dynamic = "force-dynamic";

export default async function DividendsPage() {
  const model = await getDividendModel();
  return <DividendsClient model={model} />;
}
