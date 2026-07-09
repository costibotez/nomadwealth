"use client";

import { useEffect, useState } from "react";
import { GripVertical, X, Plus, SlidersHorizontal, Check } from "lucide-react";
import { Money, MoneyDelta, Pct } from "@/components/ui/money";

export interface TileMetric {
  id: string;
  label: string;
  type: "money" | "moneyCompact" | "moneyDelta" | "pct";
  eur?: number;
  pct?: number | null;
}

const STORAGE_KEY = "pid.overviewTiles";

function TileValue({ m }: { m: TileMetric }) {
  switch (m.type) {
    case "money":
      return <Money eur={m.eur ?? 0} />;
    case "moneyCompact":
      return <Money eur={m.eur ?? 0} compact />;
    case "moneyDelta":
      return <MoneyDelta eur={m.eur ?? 0} />;
    case "pct":
      return <Pct value={m.pct ?? null} signed={false} colored={false} />;
  }
}

/**
 * Customizable KPI row. Users pick which metrics show and in what order; the
 * choice persists per browser. Drag to reorder, remove with ✕, add hidden
 * metrics from the picker. Falls back to `defaultIds` when nothing is saved.
 */
export function StatTiles({ catalog, defaultIds }: { catalog: TileMetric[]; defaultIds: string[] }) {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const [ids, setIds] = useState<string[]>(defaultIds);
  const [editing, setEditing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Restore saved layout on mount, dropping any ids no longer in the catalog.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = (JSON.parse(raw) as string[]).filter((id) => byId.has(id));
        if (saved.length) setIds(saved);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(next: string[]) {
    setIds(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persist(next);
  }

  const visible = ids.map((id) => byId.get(id)).filter((m): m is TileMetric => !!m);
  const hidden = catalog.filter((m) => !ids.includes(m.id));

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <button
          onClick={() => setEditing((e) => !e)}
          className="focusring flex items-center gap-1.5 rounded-lg border border-border bg-panel px-2.5 py-1 text-xs text-ink-muted hover:bg-hover hover:text-ink"
        >
          {editing ? <Check size={13} /> : <SlidersHorizontal size={13} />}
          {editing ? "Done" : "Customize"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {visible.map((m, i) => (
          <div
            key={m.id}
            draggable={editing}
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => editing && e.preventDefault()}
            onDrop={() => {
              if (dragIndex != null) reorder(dragIndex, i);
              setDragIndex(null);
            }}
            className={`card relative p-4 ${editing ? "cursor-move ring-1 ring-border" : ""} ${
              dragIndex === i ? "opacity-50" : ""
            }`}
          >
            {editing && (
              <>
                <GripVertical size={14} className="absolute left-1.5 top-1.5 text-ink-faint" />
                <button
                  onClick={() => persist(ids.filter((id) => id !== m.id))}
                  className="focusring absolute right-1.5 top-1.5 rounded p-0.5 text-ink-faint hover:bg-hover hover:text-loss"
                  aria-label={`Remove ${m.label}`}
                >
                  <X size={14} />
                </button>
              </>
            )}
            <div className="stat-label">{m.label}</div>
            <div className="mt-1.5 text-lg font-semibold">
              <TileValue m={m} />
            </div>
            {m.type === "moneyDelta" && m.pct != null && (
              <div className="mt-0.5 text-xs">
                <Pct value={m.pct} />
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="mt-3 rounded-xl border border-dashed border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="stat-label">Add a metric</span>
            <button
              onClick={() => persist(defaultIds)}
              className="focusring rounded text-xs text-ink-faint hover:text-ink"
            >
              Reset to default
            </button>
          </div>
          {hidden.length === 0 ? (
            <p className="text-xs text-ink-faint">All available metrics are shown.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {hidden.map((m) => (
                <button
                  key={m.id}
                  onClick={() => persist([...ids, m.id])}
                  className="focusring flex items-center gap-1 rounded-lg border border-border bg-panel px-2.5 py-1 text-xs text-ink-muted hover:bg-hover hover:text-ink"
                >
                  <Plus size={12} /> {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
