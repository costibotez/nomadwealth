import Link from "next/link";
import { Check } from "lucide-react";
import { Eyebrow } from "@/components/nw/primitives";
import {
  OWN_DATA,
  FEATURES,
  COMPARE_ROWS,
  OWN,
  HOSTED,
  OWN_TCO,
  OWN_GUARANTEE,
  OWN_RENEWAL,
  WHO_ITS_FOR,
  TESTIMONIALS,
} from "./content";
import { EarlyAccessForm } from "./EarlyAccessForm";
import {
  type ActiveCampaign,
  discountPriceString,
  withPrefilledPromo,
} from "@/lib/campaign";

export function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-[1080px] px-7 pb-10 pt-20">
      <Eyebrow>What people say</Eyebrow>
      <h2 className="mt-3.5 max-w-[24ch] text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.03em] text-text">
        One clear number — on their own terms.
      </h2>
      <div className="mt-11 grid gap-[18px] lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <figure key={t.name} className="flex flex-col rounded-card border border-line bg-surface p-6">
            <blockquote className="flex-1">
              <p className="text-[16px] font-semibold leading-snug text-text">
                &ldquo;{t.headline}&rdquo;
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">{t.body}</p>
            </blockquote>
            <figcaption className="mt-5 border-t border-line pt-4">
              <div className="text-[14px] font-medium text-text-2">{t.name}</div>
              <div className="text-[13px] text-dim">{t.role}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function WhoItsForSection() {
  return (
    <section className="mx-auto max-w-[1080px] px-7 pb-10 pt-24">
      <Eyebrow>Who it&apos;s for</Eyebrow>
      <h2 className="mt-3.5 max-w-[22ch] text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.03em] text-text">
        Built for the balance sheet a brokerage app can&apos;t hold.
      </h2>
      <div className="mt-11 grid gap-[18px] sm:grid-cols-2">
        {WHO_ITS_FOR.map((w) => (
          <div key={w.title} className="rounded-card border border-line bg-surface p-6">
            <div className="mb-4 grid h-[38px] w-[38px] place-items-center rounded-md bg-brand-tint text-brand">
              <w.icon size={18} />
            </div>
            <h3 className="text-[17px] font-semibold text-text">{w.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">{w.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function EarlyAccessSection() {
  return (
    <section
      id="early-access"
      className="mx-auto max-w-[1080px] scroll-mt-20 px-7 pb-10 pt-20"
    >
      <div className="rounded-panel border border-brand bg-[linear-gradient(180deg,var(--accent-tint-2),var(--surface))] px-7 py-12 text-center sm:px-12">
        <Eyebrow>Stay in the loop</Eyebrow>
        <h2 className="mx-auto mt-3.5 max-w-[20ch] text-[clamp(26px,3.5vw,38px)] font-bold tracking-[-0.03em] text-text">
          Not ready to buy today?
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-relaxed text-muted">
          Leave your email and we&apos;ll send you new releases, launch
          discounts and self-hosting tips — just your email, never a bank
          login.
        </p>
        <div className="mt-8">
          <EarlyAccessForm />
        </div>
        <p className="mt-5 text-[13px] text-dim">
          No card required · 30-day money-back guarantee · Unsubscribe anytime
        </p>
      </div>
    </section>
  );
}

export function OwnDataSection() {
  return (
    <section className="mx-auto max-w-[1080px] px-7 pb-10 pt-24">
      <Eyebrow>Own your data</Eyebrow>
      <h2 className="mt-3.5 max-w-[20ch] text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.03em] text-text">
        Cloud finance apps rent you access to your own numbers. We don&apos;t.
      </h2>
      <div className="mt-11 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {OWN_DATA.map((o) => (
          <div key={o.title} className="rounded-card border border-line bg-surface p-6">
            <div className="mb-4 grid h-[38px] w-[38px] place-items-center rounded-md bg-brand-tint text-brand">
              <o.icon size={18} />
            </div>
            <h3 className="text-[17px] font-semibold text-text">{o.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">{o.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-[1080px] scroll-mt-20 px-7 pb-10 pt-16">
      <h2 className="text-[clamp(26px,3.5vw,36px)] font-bold tracking-[-0.03em] text-text">
        One cockpit for everything you own.
      </h2>
      <div className="mt-9 grid gap-px overflow-hidden rounded-card border border-line bg-[color:var(--line)] sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.tag} className="bg-surface-2 p-7">
            <div className="mono text-[13px] font-semibold text-brand">{f.tag}</div>
            <h3 className="mt-3 text-[17px] font-semibold text-text">{f.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Mark({ v }: { v: string }) {
  if (v === "✓")
    return <span className="font-bold text-[color:var(--nw-gain)]">✓</span>;
  return <span className="text-dim">{v}</span>;
}

export function ComparisonSection() {
  return (
    <section className="mx-auto max-w-[1080px] px-7 pb-10 pt-16">
      <h2 className="mb-2 text-[clamp(26px,3.5vw,36px)] font-bold tracking-[-0.03em] text-text">
        Breadth the alternatives don&apos;t have.
      </h2>
      <p className="mb-8 text-muted">
        Ghostfolio is investment-only. Cloud apps hold your data hostage.
        NomadWealth does both, on your own box.
      </p>
      <div className="overflow-hidden rounded-card border border-line-strong">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] bg-surface text-[13px] font-semibold">
          <div className="px-5 py-4 text-muted" />
          <div className="border-l border-line px-3 py-4 text-center text-brand">NomadWealth</div>
          <div className="border-l border-line px-3 py-4 text-center text-muted">Cloud apps</div>
          <div className="border-l border-line px-3 py-4 text-center text-muted">Ghostfolio</div>
        </div>
        {COMPARE_ROWS.map((r, i) => (
          <div
            key={r.label}
            className={
              "grid grid-cols-[2fr_1fr_1fr_1fr] border-t border-hair " +
              (i % 2 ? "bg-surface-2" : "bg-surface-3")
            }
          >
            <div className="px-5 py-3.5 text-[14px] text-text-2">{r.label}</div>
            <div className="border-l border-line px-3 py-3.5 text-center"><Mark v={r.us} /></div>
            <div className="border-l border-line px-3 py-3.5 text-center text-dim"><Mark v={r.cloud} /></div>
            <div className="border-l border-line px-3 py-3.5 text-center text-dim"><Mark v={r.ghost} /></div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[14px] text-muted">
        See the full breakdown:{" "}
        <Link
          href="/vs/ghostfolio"
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          NomadWealth vs Ghostfolio
        </Link>{" "}
        ·{" "}
        <Link
          href="/vs/spreadsheet"
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          NomadWealth vs a spreadsheet
        </Link>
      </p>
    </section>
  );
}

export function PricingSection({
  campaign = null,
}: {
  campaign?: ActiveCampaign | null;
}) {
  // Campaign discount only applies to the one-time "Own it" price.
  const ownPriced = campaign
    ? discountPriceString(OWN.price, campaign.discountPct)
    : null;
  const ownHref = campaign
    ? withPrefilledPromo(OWN.href, campaign.promoCode)
    : OWN.href;

  return (
    <section id="pricing" className="mx-auto max-w-[1080px] scroll-mt-20 px-7 pb-10 pt-20">
      <Eyebrow>Pricing</Eyebrow>
      <h2 className="mt-3.5 text-[clamp(26px,3.5vw,38px)] font-bold tracking-[-0.03em] text-text">
        Two honest choices. No third box.
      </h2>
      <p className="mt-4 max-w-[52ch] text-[16px] text-muted">
        Own the software outright, or let us run it for you. Either way your
        financial data lives in <span className="text-text">your</span> Neon —
        we literally can&apos;t see it.
      </p>
      {campaign && (
        <p className="mono mt-4 inline-flex items-center gap-2 rounded-full bg-brand-tint px-3.5 py-1.5 text-[13px] font-semibold text-brand">
          {campaign.discountPct}% off · code {campaign.promoCode} applied at
          checkout
        </p>
      )}

      <div className="mt-11 grid items-stretch gap-[18px] md:grid-cols-2">
        {/* ── Own it (featured) ─────────────────────────────────────────── */}
        <div className="relative rounded-panel border-[1.5px] border-brand bg-[linear-gradient(180deg,var(--accent-tint-2),var(--surface))] p-7">
          <div className="flex items-center gap-2.5">
            <span className="text-[16px] font-semibold text-text">{OWN.name}</span>
            <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold text-brand-on">
              {OWN.badge}
            </span>
          </div>
          <div className="my-3.5 flex items-baseline gap-1.5">
            {ownPriced ? (
              <>
                <span className="mono text-[22px] font-semibold text-dim line-through">
                  {ownPriced.original}
                </span>
                <span className="mono text-[42px] font-semibold text-text">
                  {ownPriced.discounted}
                </span>
              </>
            ) : (
              <span className="mono text-[42px] font-semibold text-text">{OWN.price}</span>
            )}
            <span className="text-[14px] text-muted">{OWN.cadence}</span>
          </div>
          <div className="text-[13px] text-muted">{OWN.sub}</div>

          <div className="my-5 h-px bg-[color:var(--line)]" />
          <ul className="space-y-1.5">
            {OWN.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 py-1 text-[14px] text-text-2">
                <Check size={15} className="text-brand" />
                {f}
              </li>
            ))}
          </ul>

          {/* Cost-of-ownership reframe */}
          <div className="mt-6 rounded-card border border-line bg-surface-2 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {OWN_TCO.headline}
              </span>
              <span className="mono text-[12px] font-semibold text-nw-gain">{OWN_TCO.keep}</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {OWN_TCO.rows.map((r, i) => (
                <div key={r.label}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-text-2">{r.label}</span>
                    <span className="mono text-text">{r.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[color:var(--line)]">
                    <div
                      className={"h-full rounded-full " + (i === 0 ? "bg-brand" : "bg-dim")}
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">{OWN_TCO.note}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-dim">{OWN_TCO.source}</p>
          </div>

          <a
            href={ownHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 block rounded-btn bg-brand py-3.5 text-center text-[15px] font-semibold text-brand-on shadow-brand-glow transition hover:-translate-y-0.5 hover:shadow-brand-glow-hover"
          >
            {OWN.cta}
          </a>

          {/* Money-back guarantee */}
          <div className="mt-4 flex items-start gap-3 rounded-card border border-line bg-surface-2 p-4">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--nw-gain)]/15">
              <Check size={14} className="text-nw-gain" />
            </span>
            <p className="text-[13px] leading-relaxed text-text-2">
              <span className="font-semibold text-text">{OWN_GUARANTEE.title}</span>{" "}
              {OWN_GUARANTEE.body}
            </p>
          </div>

          {/* Renewal — reframed as optional upside */}
          <div className="my-5 h-px bg-[color:var(--line)]" />
          <p className="text-[12px] leading-relaxed text-muted">
            <span className="font-semibold text-text-2">{OWN_RENEWAL.lead}</span>
            {OWN_RENEWAL.body}
            <span className="font-semibold text-text-2">{OWN_RENEWAL.emphasis}</span>
            {OWN_RENEWAL.tail}
          </p>
        </div>

        {/* ── We host it (secondary) ────────────────────────────────────── */}
        <div className="flex flex-col rounded-panel border border-line-strong bg-surface p-7">
          <span className="text-[16px] font-semibold text-text">{HOSTED.name}</span>
          <div className="my-3.5 flex items-baseline gap-1.5">
            <span className="mono text-[42px] font-semibold text-text">{HOSTED.price}</span>
            <span className="text-[14px] text-muted">{HOSTED.cadence}</span>
          </div>
          <div className="text-[13px] text-muted">{HOSTED.sub}</div>

          <div className="my-5 h-px bg-[color:var(--line)]" />
          <ul className="space-y-1.5">
            {HOSTED.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 py-1 text-[14px] text-text-2">
                <Check size={15} className="text-dim" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-card border border-line bg-surface-2 p-4 text-[13px] leading-relaxed text-muted">
            {HOSTED.note}
          </div>

          <div className="mt-auto pt-6">
            <a
              href={HOSTED.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-btn border border-btn bg-[color:var(--chip)] py-3.5 text-center text-[15px] font-semibold text-text transition hover:-translate-y-0.5 hover:bg-[color:var(--hair)]"
            >
              {HOSTED.cta}
            </a>
            <p className="mt-3 text-center text-[12px] text-dim">{HOSTED.footer}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
