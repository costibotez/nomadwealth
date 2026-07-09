"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Eye, Link2, Trash2, Ban } from "lucide-react";
import { Card, SectionTitle, Badge, EmptyState } from "@/components/ui/primitives";
import { Field, inputClass } from "@/components/ui/Modal";
import { SHAREABLE_TABS } from "@/config/share-tabs";
import {
  createShareLinkAction,
  revokeShareLinkAction,
  deleteShareLinkAction,
} from "@/app/share-actions";

export interface ShareLinkView {
  id: number;
  label: string;
  allowedTabs: string[];
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastViewedAt: string | null;
}

const LABEL_BY_HREF = Object.fromEntries(SHAREABLE_TABS.map((t) => [t.href, t.label]));

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusOf(l: ShareLinkView): { label: string; tone: "gain" | "amber" | "loss" | "neutral" } {
  if (l.revokedAt) return { label: "revoked", tone: "loss" };
  if (l.expiresAt && new Date(l.expiresAt).getTime() <= Date.now()) return { label: "expired", tone: "neutral" };
  return { label: "active", tone: "gain" };
}

export function ShareManager({ links }: { links: ShareLinkView[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["/"]));
  const [label, setLabel] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("0");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggle(href: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  }

  function create() {
    setError(null);
    setCreated(null);
    setCopied(false);
    start(async () => {
      const res = await createShareLinkAction({
        label,
        allowedTabs: Array.from(selected),
        expiresInDays: Number(expiresInDays) || 0,
      });
      if (res.ok) {
        const url = `${window.location.origin}/share/${res.token}`;
        setCreated(url);
        setLabel("");
      } else {
        setError(res.error);
      }
    });
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <Card>
        <SectionTitle>Create a view-only link</SectionTitle>
        <p className="mt-1 text-sm text-ink-faint">
          Anyone with the link can view the tabs you pick — no editing, no login. The full link is shown once, here, right after you create it.
        </p>

        <div className="mt-4">
          <div className="stat-label mb-2">Tabs to share</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SHAREABLE_TABS.map((t) => {
              const on = selected.has(t.href);
              return (
                <button
                  key={t.href}
                  type="button"
                  onClick={() => toggle(t.href)}
                  className={`focusring flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    on ? "border-accent bg-accent-soft text-accent" : "border-border text-ink-muted hover:bg-hover"
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${on ? "border-accent bg-accent text-black" : "border-border"}`}>
                    {on && <Check size={12} />}
                  </span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Label (optional, for your reference)">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. For my accountant" className={inputClass} />
          </Field>
          <Field label="Expires after">
            <select value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} className={inputClass}>
              <option value="0">Never</option>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </Field>
        </div>

        {error && <p className="mt-3 text-sm text-loss">{error}</p>}

        <div className="mt-4">
          <button
            onClick={create}
            disabled={pending || selected.size === 0}
            className="focusring flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50"
          >
            <Link2 size={15} /> {pending ? "Creating…" : "Create link"}
          </button>
        </div>

        {created && (
          <div className="mt-4 rounded-xl border border-accent/40 bg-accent-soft/40 p-3">
            <div className="stat-label mb-1.5 flex items-center gap-1.5 text-accent">
              <Eye size={13} /> Your view-only link (copy it now)
            </div>
            <div className="flex items-center gap-2">
              <input readOnly value={created} className={`${inputClass} flex-1 text-xs`} onFocus={(e) => e.currentTarget.select()} />
              <button onClick={() => copy(created)} className="focusring flex items-center gap-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm hover:bg-hover">
                {copied ? <Check size={14} className="text-gain" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Existing links</SectionTitle>
        {links.length === 0 ? (
          <div className="mt-3"><EmptyState message="No share links yet." /></div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-ink-faint">
                  <th className="py-2 font-medium">Label</th>
                  <th className="py-2 font-medium">Tabs</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Created</th>
                  <th className="py-2 font-medium">Expires</th>
                  <th className="py-2 font-medium">Last viewed</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <ShareRow key={l.id} link={l} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-ink-faint">
          For security, links can&apos;t be shown again after creation — only their hash is stored. If you lose a link, revoke it and create a new one.
        </p>
      </Card>
    </div>
  );
}

function ShareRow({ link }: { link: ShareLinkView }) {
  const [pending, start] = useTransition();
  const status = statusOf(link);
  const tabLabels = link.allowedTabs.map((h) => LABEL_BY_HREF[h] ?? h);

  return (
    <tr className="border-b border-border/50">
      <td className="py-2">{link.label || <span className="text-ink-faint">—</span>}</td>
      <td className="max-w-[220px] py-2 text-ink-muted">{tabLabels.join(", ")}</td>
      <td className="py-2"><Badge tone={status.tone}>{status.label}</Badge></td>
      <td className="py-2 text-ink-muted">{fmtDate(link.createdAt)}</td>
      <td className="py-2 text-ink-muted">{fmtDate(link.expiresAt)}</td>
      <td className="py-2 text-ink-muted">{fmtDate(link.lastViewedAt)}</td>
      <td className="py-2">
        <div className="flex justify-end gap-1">
          {!link.revokedAt && (
            <button
              onClick={() => { if (confirm("Revoke this link? It will stop working immediately.")) start(async () => { await revokeShareLinkAction(link.id); }); }}
              disabled={pending}
              title="Revoke"
              className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-loss"
            >
              <Ban size={14} />
            </button>
          )}
          <button
            onClick={() => { if (confirm("Delete this link permanently from the list?")) start(async () => { await deleteShareLinkAction(link.id); }); }}
            disabled={pending}
            title="Delete"
            className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-loss"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
