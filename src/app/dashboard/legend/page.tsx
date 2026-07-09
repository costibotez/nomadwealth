import { getCashflow } from "@/lib/page-data";
import { LegendClient } from "@/components/legend/LegendClient";

export const dynamic = "force-dynamic";

export default async function LegendPage() {
  const c = await getCashflow();
  return <LegendClient sources={c.sources} />;
}
