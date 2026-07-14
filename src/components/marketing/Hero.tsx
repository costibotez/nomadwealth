"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/nw/primitives";
import { HeroChart } from "./HeroChart";
import { TYPED_WORDS, DEPLOY_URL } from "./content";

/** Landing hero: reserved-height typewriter headline + cursor-follow spotlight. */
export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("typing");

  useEffect(() => {
    const word = TYPED_WORDS[idx];
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (text.length < word.length) {
        t = setTimeout(() => setText(word.slice(0, text.length + 1)), 80);
      } else {
        t = setTimeout(() => setPhase("pausing"), 2600);
      }
    } else if (phase === "pausing") {
      t = setTimeout(() => setPhase("deleting"), 200);
    } else {
      if (text.length > 0) {
        t = setTimeout(() => setText(word.slice(0, text.length - 1)), 38);
      } else {
        setIdx((i) => (i + 1) % TYPED_WORDS.length);
        setPhase("typing");
      }
    }
    return () => clearTimeout(t);
  }, [text, phase, idx]);

  function onMove(e: React.MouseEvent) {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <div ref={heroRef} onMouseMove={onMove} className="relative overflow-hidden">
      <div className="fx-grid" aria-hidden />
      <div className="fx-blob fx-blob--a" aria-hidden />
      <div className="fx-blob fx-blob--b" aria-hidden />
      <div className="fx-spotlight" aria-hidden />

      <div className="relative z-10 mx-auto max-w-[1120px] px-7 pb-16 pt-24 text-center">
        <div
          className="mb-7 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px]"
          style={{
            borderColor: "var(--accent-ring)",
            background: "var(--accent-tint-2)",
            color: "var(--accent-ink)",
          }}
        >
          <span className="fx-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-brand" />
          We literally can&apos;t see your data
        </div>

        <h1 className="mx-auto max-w-[18ch] text-[clamp(34px,6vw,68px)] font-bold leading-[1.08] tracking-[-0.035em] text-text">
          Your entire net worth — down to
          <br />
          <span
            className="inline-block whitespace-nowrap text-brand"
            style={{ minHeight: "1.1em" }}
          >
            {text}
            <span className="fx-caret">|</span>
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-[58ch] text-[clamp(17px,2vw,21px)] leading-[1.55] text-muted">
          Public holdings, real estate, private loans and business income —
          valued in the one currency you actually think in. Not just the slice
          your brokerage can see.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3.5">
          <Link href="/demo">
            <Button size="lg">Try the live demo →</Button>
          </Link>
          <a href="#pricing">
            <Button size="lg" variant="secondary">
              Own it — €149 once
            </Button>
          </a>
        </div>

        <p className="mt-4 text-[13px] text-dim">
          No signup for the demo.{" "}
          <span className="text-muted">30-day money-back guarantee.</span>{" "}
          <a href="#early-access" className="underline-offset-2 hover:text-brand hover:underline">
            Or join the mailing list
          </a>
          .
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-6 text-[13px] text-dim">
          <a
            href={DEPLOY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand"
          >
            ◆ Deploy to Vercel in one click
          </a>
          <Link href="/cockpit" className="hover:text-brand">
            ◆ Explore the cockpit
          </Link>
          <span>◆ Bring your own Neon</span>
          <span>◆ Open source</span>
        </div>
      </div>

      {/* product preview card */}
      <div className="mx-auto max-w-[1080px] px-7 pb-4">
        <div
          className="overflow-hidden rounded-panel border border-line-strong shadow-float"
          style={{ background: "linear-gradient(180deg,var(--surface),var(--surface-2))" }}
        >
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <div>
              <div className="text-[12px] tracking-[0.02em] text-dim">
                TOTAL NET WORTH
              </div>
              <div className="mt-1 flex items-baseline gap-2.5">
                <span className="mono text-[30px] font-semibold tracking-[-0.02em] text-text">
                  €1,033,500
                </span>
                <span className="mono text-[13px] text-[color:var(--nw-gain)]">
                  +19.6%
                </span>
              </div>
            </div>
            <div className="flex gap-1 text-[12px]">
              <span className="rounded-pill bg-brand-tint px-2.5 py-1 text-brand">EUR</span>
              <span className="px-2.5 py-1 text-dim">USD</span>
              <span className="px-2.5 py-1 text-dim">GBP</span>
            </div>
          </div>
          <div className="h-[230px] px-1.5 pt-2">
            <HeroChart />
          </div>
        </div>
      </div>
    </div>
  );
}
