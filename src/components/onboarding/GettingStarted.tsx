"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, PencilLine, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/primitives";

/**
 * First-run panel shown on /dashboard when the install has no data yet —
 * instead of a wall of empty €0 charts, guide the owner to their first rows.
 */
export function GettingStarted() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSample() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sample-data", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not load sample data.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="px-2 py-6 text-center sm:py-10">
        <h2 className="text-xl font-semibold text-ink">
          Welcome to your cockpit
        </h2>
        <p className="mx-auto mt-2 max-w-[52ch] text-sm text-ink-muted">
          It&apos;s empty because it only shows <em>your</em> data — and there
          isn&apos;t any yet. Pick a way in:
        </p>

        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
          <StartTile
            href="/dashboard/import"
            icon={<Upload size={22} />}
            title="Import a file"
            body="Bring a CSV or Excel export from your bank, broker or spreadsheet."
          />
          <StartTile
            href="/dashboard/holdings"
            icon={<PencilLine size={22} />}
            title="Add by hand"
            body="Enter your first holding, account, property or loan manually."
          />
          <button
            onClick={loadSample}
            disabled={busy}
            className="focusring rounded-xl border border-dashed border-border bg-panel p-5 text-left transition hover:border-accent disabled:opacity-50"
          >
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <Sparkles size={22} />
            </div>
            <div className="font-medium text-ink">
              {busy ? "Loading sample data…" : "Load sample data"}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              Explore with a small fictional portfolio — remove it again with
              one click.
            </p>
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-loss">
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}

function StartTile({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="focusring rounded-xl border border-border bg-panel p-5 text-left transition hover:border-accent"
    >
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
        {icon}
      </div>
      <div className="font-medium text-ink">{title}</div>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{body}</p>
    </Link>
  );
}

/** Banner shown while seeded sample data is present, with one-click removal. */
export function SampleDataBanner() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function clear() {
    setBusy(true);
    try {
      await fetch("/api/sample-data", { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-panel px-4 py-3 text-sm">
      <span className="text-ink-muted">
        <Sparkles size={14} className="mr-1.5 inline text-accent" />
        You&apos;re looking at sample data. Replace it with your own whenever
        you&apos;re ready.
      </span>
      <button
        onClick={clear}
        disabled={busy}
        className="focusring rounded-lg border border-border px-3 py-1.5 font-medium text-ink transition hover:border-loss hover:text-loss disabled:opacity-50"
      >
        {busy ? "Removing…" : "Clear sample data"}
      </button>
    </div>
  );
}
