"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Card, EmptyState, Badge } from "@/components/ui/primitives";
import { Modal, inputClass } from "@/components/ui/Modal";
import { restore, purge } from "@/app/actions";

export interface TrashItem {
  entity: "transaction" | "loan" | "account" | "property" | "loan_payment";
  id: number;
  label: string;
  deletedAt: string | null;
}

export function TrashClient({ items }: { items: TrashItem[] }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<TrashItem | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return <EmptyState message="Trash is empty. Deleted items appear here and can be restored." />;

  function onRestore(it: TrashItem) {
    start(async () => { await restore(it.entity, it.id); });
  }
  function onPurge() {
    if (!confirming) return;
    setError(null);
    start(async () => {
      const res = await purge(confirming.entity, confirming.id, text);
      if (res.ok) { setConfirming(null); setText(""); }
      else setError(res.error);
    });
  }

  return (
    <div className="animate-fade-up space-y-3">
      <Card className="p-0">
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={`${it.entity}-${it.id}`} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="flex items-center gap-3">
                <Badge>{it.entity.replace("_", " ")}</Badge>
                <span>{it.label}</span>
                {it.deletedAt && <span className="text-xs text-ink-faint">deleted {it.deletedAt.slice(0, 10)}</span>}
              </span>
              <span className="flex gap-1">
                <button onClick={() => onRestore(it)} disabled={pending} className="focusring flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-hover">
                  <RotateCcw size={13} /> Restore
                </button>
                <button onClick={() => { setConfirming(it); setText(""); setError(null); }} className="focusring flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-ink-faint hover:bg-hover hover:text-loss">
                  <Trash2 size={13} /> Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={!!confirming} onClose={() => setConfirming(null)} title="Permanently delete">
        <p className="text-sm text-ink-muted">
          This permanently deletes <span className="text-ink">{confirming?.label}</span>. This cannot be undone.
          Type <span className="font-mono text-accent">DELETE</span> to confirm.
        </p>
        <input value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} mt-3`} placeholder="DELETE" />
        {error && <p className="mt-2 text-sm text-loss">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setConfirming(null)} className="focusring rounded-lg border border-border px-4 py-2 text-sm hover:bg-hover">Cancel</button>
          <button onClick={onPurge} disabled={pending || text !== "DELETE"} className="focusring rounded-lg bg-loss px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-40">
            Delete forever
          </button>
        </div>
      </Modal>
    </div>
  );
}
