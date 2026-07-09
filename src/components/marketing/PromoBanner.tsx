import type { ActiveCampaign } from "@/lib/campaign";
import { defaultBannerText } from "@/lib/campaign";

/**
 * Full-width promo banner shown at the top of the marketing pages while a
 * pricing campaign is active. On-brand accent (#ff7a18) with on-accent ink for
 * WCAG-AA contrast. Renders nothing when there is no campaign — the common
 * case for buyer self-host installs.
 */
export function PromoBanner({ campaign }: { campaign: ActiveCampaign | null }) {
  if (!campaign) return null;
  const text = campaign.bannerText ?? defaultBannerText(campaign);

  return (
    <div
      role="region"
      aria-label="Pricing promotion"
      className="bg-brand text-brand-on"
    >
      <a
        href="#pricing"
        className="mx-auto flex max-w-[1080px] items-center justify-center gap-2 px-7 py-2.5 text-center text-[14px] font-semibold tracking-[-0.01em] transition hover:opacity-90"
      >
        <span aria-hidden="true">🎉</span>
        <span>{text}</span>
        <span aria-hidden="true" className="hidden sm:inline">
          →
        </span>
      </a>
    </div>
  );
}
