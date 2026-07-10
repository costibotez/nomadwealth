import { Check } from "lucide-react";
import { Eyebrow } from "@/components/nw/primitives";
import { OWN_DATA, FEATURES, COMPARE_ROWS, PRICING, WHO_ITS_FOR, TESTIMONIALS } from "./content";
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
        <Eyebrow>Pre-launch</Eyebrow>
        <h2 className="mx-auto mt-3.5 max-w-[20ch] text-[clamp(26px,3.5vw,38px)] font-bold tracking-[-0.03em] text-text">
          Get early access to NomadWealth.
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-relaxed text-muted">
          Be first in when we open the doors. We&apos;ll email you the moment
          early access is ready — just your email, never a bank login.
        </p>
        <div className="mt-8">
          <EarlyAccessForm />
        </div>
        <p className="mt-5 text-[13px] text-dim">
          No card required · 30-day money-back guarantee at launch · Unsubscribe anytime
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
            <div className="mt-3 text-[17px] font-semibold text-text">{f.title}</div>
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
    </section>
  );
}

export function PricingSection({
  campaign = null,
}: {
  campaign?: ActiveCampaign | null;
}) {
  return (
    <section id="pricing" className="mx-auto max-w-[1080px] scroll-mt-20 px-7 pb-10 pt-20">
      <div className="mx-auto mb-2 max-w-[60ch] text-center">
        <h2 className="text-[clamp(26px,3.5vw,38px)] font-bold tracking-[-0.03em] text-text">
          Pay once. Own it forever.
        </h2>
        <p className="mt-4 text-[16px] text-brand-ink">
          We literally can&apos;t see your data — it lives in your Neon, not ours.
        </p>
        <p className="mt-2 text-[14px] text-muted">
          Backed by a 30-day money-back guarantee.
        </p>
        {campaign && (
          <p className="mono mt-4 inline-flex items-center gap-2 rounded-full bg-brand-tint px-3.5 py-1.5 text-[13px] font-semibold text-brand">
            {campaign.discountPct}% off · code {campaign.promoCode} applied at
            checkout
          </p>
        )}
      </div>
      <div className="mt-11 grid gap-[18px] md:grid-cols-3">
        {PRICING.map((t) => {
          const priced = campaign
            ? discountPriceString(t.price, campaign.discountPct)
            : null;
          const href = campaign
            ? withPrefilledPromo(t.href, campaign.promoCode)
            : t.href;
          return (
          <div
            key={t.name}
            className={
              "relative rounded-panel p-7 " +
              (t.featured
                ? "border-[1.5px] border-brand bg-[linear-gradient(180deg,var(--accent-tint-2),var(--surface))]"
                : t.comingSoon
                  ? "border border-dashed border-btn bg-surface-3"
                  : "border border-line-strong bg-surface")
            }
          >
            {t.featured && (
              <div className="absolute -top-[11px] left-7 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold text-brand-on">
                MOST POPULAR
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-semibold text-text">{t.name}</span>
              {t.comingSoon && (
                <span className="rounded-full border border-btn px-2 py-0.5 text-[10px] text-muted">
                  COMING SOON
                </span>
              )}
            </div>
            <div className="my-3.5 flex items-baseline gap-1.5">
              {priced ? (
                <>
                  <span className="mono text-[20px] font-semibold text-dim line-through">{priced.original}</span>
                  <span className="mono text-[38px] font-semibold text-text">{priced.discounted}</span>
                </>
              ) : (
                <span className="mono text-[38px] font-semibold text-text">{t.price}</span>
              )}
              <span className="text-[14px] text-muted">{t.cadence}</span>
            </div>
            <div className="text-[13px] text-muted">{t.sub}</div>
            <div className="my-5 h-px bg-[color:var(--line)]" />
            <ul className="space-y-1.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 py-1 text-[14px] text-text-2">
                  <Check size={15} className={t.featured ? "text-brand" : "text-dim"} />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={
                "mt-6 block rounded-btn py-3.5 text-center text-[15px] font-semibold transition hover:-translate-y-0.5 " +
                (t.featured
                  ? "bg-brand text-brand-on shadow-brand-glow hover:shadow-brand-glow-hover"
                  : "border border-btn bg-[color:var(--chip)] text-text hover:bg-[color:var(--hair)]")
              }
            >
              {t.cta}
            </a>
          </div>
          );
        })}
      </div>
    </section>
  );
}
