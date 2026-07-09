"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Card, SectionTitle, Badge } from "@/components/ui/primitives";
import { Money } from "@/components/ui/money";
import { inputClass } from "@/components/ui/Modal";
import { setIncomeLegend } from "@/app/actions";
import { INCOME_CATEGORIES } from "@/config/income-categories";

export interface Source {
  label: string;
  eur: number;
  category: string | null;
  customLabel: string | null;
}

export function LegendClient({ sources }: { sources: Source[] }) {
  return (
    <div className="animate-fade-up space-y-4">
      <p className="text-sm text-ink-muted">
        Tag each income source from your Venituri tab. The Cash Flow page rolls income up by these tags.
      </p>
      <Card className="p-0">
        <div className="border-b border-border px-4 py-2 text-xs text-ink-faint">
          {sources.filter((s) => !s.category).length} untagged · {sources.length} sources
        </div>
        <ul className="divide-y divide-border/60">
          {sources.map((s) => (
            <LegendRow key={s.label} source={s} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function LegendRow({ source }: { source: Source }) {
  const [category, setCategory] = useState(source.category ?? "");
  const [custom, setCustom] = useState(source.customLabel ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save(nextCategory: string, nextCustom: string) {
    if (!nextCategory) return;
    start(async () => {
      const res = await setIncomeLegend({ label: source.label, category: nextCategory, customLabel: nextCustom || null });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
      <span className="min-w-0 flex-1 truncate font-medium">{source.label}</span>
      <Money eur={source.eur} compact className="w-16 text-right text-ink-faint" />
      <select
        value={category}
        onChange={(e) => {
          setCategory(e.target.value);
          save(e.target.value, custom);
        }}
        className={`${inputClass} w-56`}
      >
        <option value="" disabled>Tag…</option>
        {INCOME_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>
      {category === "startup_income" && (
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onBlur={() => save(category, custom)}
          placeholder="Startup name"
          className={`${inputClass} w-40`}
        />
      )}
      <span className="w-5">
        {pending ? (
          <span className="text-xs text-ink-faint">…</span>
        ) : saved ? (
          <Check size={15} className="text-gain" />
        ) : !source.category && !category ? (
          <Badge tone="amber">!</Badge>
        ) : null}
      </span>
    </li>
  );
}
