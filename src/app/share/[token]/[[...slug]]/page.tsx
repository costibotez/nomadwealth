import { notFound } from "next/navigation";
import { getValidShareLink, isTabAllowed } from "@/lib/share";
import { SHAREABLE_TABS, slugToHref } from "../tab-registry";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string; slug?: string[] }>;
}) {
  const { token, slug } = await params;

  // Re-validate the token on the page itself (defence-in-depth) and record the
  // view. The layout already validated, but the page is the security boundary
  // for what actually renders.
  const link = await getValidShareLink(token, { touch: true });
  if (!link) notFound();

  const href = slugToHref(slug);
  const Component = SHAREABLE_TABS[href];
  // 404 if the tab doesn't exist or this link isn't allowed to show it.
  if (!Component || !isTabAllowed(link, href)) notFound();

  return <Component />;
}
