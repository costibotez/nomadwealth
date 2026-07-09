import { listShareLinks } from "@/lib/share";
import { ShareManager, type ShareLinkView } from "@/components/share/ShareManager";

export const dynamic = "force-dynamic";

export default async function SharingPage() {
  const links = await listShareLinks();
  const view: ShareLinkView[] = links.map((l) => ({
    id: l.id,
    label: l.label,
    allowedTabs: l.allowedTabs,
    createdAt: l.createdAt.toISOString(),
    expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
    revokedAt: l.revokedAt ? l.revokedAt.toISOString() : null,
    lastViewedAt: l.lastViewedAt ? l.lastViewedAt.toISOString() : null,
  }));
  return <ShareManager links={view} />;
}
