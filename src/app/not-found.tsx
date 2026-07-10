import Link from "next/link";
import { Home, PlayCircle, LayoutDashboard, ShieldCheck, MessageSquare, ArrowRight } from "lucide-react";
import { PublicHeader } from "@/components/nw/PublicHeader";
import { Footer } from "@/components/marketing/Footer";
import { Eyebrow, Button } from "@/components/nw/primitives";

const NEXT_STEPS = [
  { icon: PlayCircle, title: "Try the live demo", body: "Click around the cockpit with sample data — no signup.", href: "/demo" },
  { icon: LayoutDashboard, title: "Explore the cockpit", body: "See every surface: net worth, holdings, FIRE and more.", href: "/cockpit" },
  { icon: ShieldCheck, title: "Security & privacy", body: "How your data stays on your own infrastructure.", href: "/security" },
  { icon: MessageSquare, title: "Feedback & support", body: "Found a broken link? Tell us and we'll fix it.", href: "/feedback" },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <PublicHeader />
      <main className="mx-auto grid max-w-[1080px] items-start gap-12 px-7 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
        {/* left */}
        <div>
          <Eyebrow>404</Eyebrow>
          <h1 className="mt-3.5 text-[clamp(40px,7vw,72px)] font-bold leading-[1.05] tracking-[-0.035em]">
            This link 404&apos;d.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-muted">
            The page may be old, mistyped, or moved to a better home. Let&apos;s get you
            back to the parts of NomadWealth that actually help.
          </p>
          <div className="mt-9 flex flex-wrap gap-3.5">
            <Link href="/">
              <Button size="lg">
                <Home size={17} /> Back to homepage
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="secondary">
                <PlayCircle size={17} /> Try the demo
              </Button>
            </Link>
          </div>
        </div>

        {/* right: good next steps */}
        <div className="rounded-panel border border-line-strong bg-surface p-4 shadow-float sm:p-5">
          <div className="px-2 pb-2 pt-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-brand">
            Good next steps
          </div>
          <div className="space-y-2">
            {NEXT_STEPS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group flex items-center gap-4 rounded-card border border-line bg-surface-2 px-4 py-3.5 transition-colors hover:border-btn hover:bg-[color:var(--hair)]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand-tint text-brand">
                  <s.icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-text">{s.title}</span>
                  <span className="block text-[13px] text-muted">{s.body}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
              </Link>
            ))}
          </div>
        </div>
      </main>

      <div className="mx-auto max-w-[1080px] px-7 pb-10">
        <div className="rounded-card border border-line bg-[color:var(--accent-tint-2)] px-5 py-4 text-[14px] text-text-2">
          Looking for something specific? Try the{" "}
          <Link href="/demo" className="font-medium text-brand hover:underline">demo</Link> or{" "}
          <Link href="/changelog" className="font-medium text-brand hover:underline">changelog</Link>, or send us the broken link via{" "}
          <Link href="/feedback" className="font-medium text-brand hover:underline">feedback</Link> and we&apos;ll fix it.
        </div>
      </div>
      <Footer />
    </div>
  );
}
