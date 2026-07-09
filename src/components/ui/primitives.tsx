import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold tracking-tight text-ink-muted">
      {children}
    </h2>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="stat-label">{label}</div>
      <div className="mt-1.5 text-xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-faint">{sub}</div>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="card grid place-items-center p-10 text-center text-sm text-ink-muted">
      {message}
    </div>
  );
}

export function PageGrid({ children }: { children: ReactNode }) {
  return <div className="animate-fade-up space-y-6">{children}</div>;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gain" | "loss" | "accent" | "amber";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-hover text-ink-muted",
    gain: "bg-gain/10 text-gain",
    loss: "bg-loss/10 text-loss",
    accent: "bg-accent-soft text-accent",
    amber: "bg-amber-500/10 text-amber-400",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
