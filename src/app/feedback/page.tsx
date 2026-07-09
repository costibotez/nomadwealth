import type { Metadata } from "next";
import { LifeBuoy, Lightbulb, MessageSquareHeart } from "lucide-react";
import { PublicHeader } from "@/components/nw/PublicHeader";
import { Footer } from "@/components/marketing/Footer";
import { Eyebrow } from "@/components/nw/primitives";
import { FeedbackForm } from "@/components/marketing/FeedbackForm";

const description =
  "Get support, request a feature, or share feedback about NomadWealth. One form, three intents — no financial data ever leaves your deployment.";

export const metadata: Metadata = {
  title: "Feedback & Support",
  description,
  alternates: { canonical: "/feedback" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Feedback & Support · NomadWealth",
    description,
    url: "/feedback",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

const INTENT_PILLARS = [
  {
    icon: LifeBuoy,
    title: "Get support",
    body: "Stuck on setup, a migration, or something not behaving? Tell us what happened and we'll help you unblock it.",
  },
  {
    icon: Lightbulb,
    title: "Request a feature",
    body: "See what's already been suggested and add your vote on the public roadmap board, or start a new thread.",
  },
  {
    icon: MessageSquareHeart,
    title: "Share feedback",
    body: "Good, bad, or somewhere in between — anonymous is fine. We read every message.",
  },
];

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <PublicHeader />
      <main className="mx-auto max-w-[820px] px-7 pb-16 pt-20">
        <Eyebrow>Feedback &amp; Support</Eyebrow>
        <h1 className="mt-3.5 text-[clamp(30px,5vw,48px)] font-bold tracking-[-0.03em]">
          Talk to us — no data required.
        </h1>
        <p className="mt-5 max-w-[60ch] text-[17px] leading-relaxed text-muted">
          One form for support questions, feature ideas and general feedback.
          Nothing here ever touches your net worth, holdings or account
          balances — just tell us what's on your mind.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {INTENT_PILLARS.map((p) => (
            <div key={p.title} className="rounded-card border border-line bg-surface p-5">
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-md bg-brand-tint text-brand">
                <p.icon size={17} />
              </div>
              <h2 className="text-[14px] font-semibold">{p.title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <FeedbackForm />
        </div>

        <p className="mt-10 text-[13px] text-dim">
          Prefer email? Write to{" "}
          <a href="mailto:hello@nomadwealth.app" className="text-brand hover:underline">
            hello@nomadwealth.app
          </a>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}
