import { PageGrid } from "@/components/ui/primitives";
import { getWeddingItems, getWeddingGifts } from "@/db/queries";
import { WeddingClient, WeddingGifts } from "@/components/wedding/WeddingClient";

export const dynamic = "force-dynamic";

export default async function WeddingPage() {
  const [items, gifts] = await Promise.all([getWeddingItems(), getWeddingGifts()]);

  return (
    <PageGrid>
      <WeddingClient items={items} />
      <WeddingGifts gifts={gifts} />
    </PageGrid>
  );
}
