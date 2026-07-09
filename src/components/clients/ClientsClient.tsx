"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, CalendarClock } from "lucide-react";
import { Card, SectionTitle, StatCard, Badge, EmptyState } from "@/components/ui/primitives";
import { Modal, Field, inputClass } from "@/components/ui/Modal";
import { useCurrency } from "@/components/CurrencyProvider";
import { useReadonly } from "@/components/ReadonlyContext";
import {
  upsertClient,
  deleteClient,
  upsertClientService,
  deleteClientService,
} from "@/app/actions";

export interface ServiceLine {
  id: number;
  type: string;
  label: string | null;
  amount: number;
  currency: string;
  cadence: string;
  timesPerYear: number | null;
  hours: number | null;
  rate: number | null;
  startDate: string | null;
  renewalDate: string | null;
  active: boolean;
  notes: string | null;
  monthlyEur: number;
  oneOffEur: number;
}
export interface ClientView {
  id: number;
  name: string;
  status: string;
  currency: string;
  notes: string | null;
  services: ServiceLine[];
  mrrEur: number;
  arrEur: number;
  oneOffEur: number;
}
export interface ClientsModel {
  clients: ClientView[];
  totalMrrEur: number;
  totalArrEur: number;
  totalOneOffEur: number;
  activeCount: number;
  renewals: {
    clientId: number;
    clientName: string;
    type: string;
    label: string | null;
    renewalDate: string;
    daysUntil: number;
    amountEur: number;
  }[];
}

const TYPES: [string, string][] = [
  ["monthly_retainer", "Monthly retainer"],
  ["one_off", "One-off"],
  ["annual_hosting", "Annual hosting"],
  ["marketing", "Marketing"],
  ["reporting", "Reporting"],
  ["hourly", "Hourly"],
  ["other", "Other"],
];
const CADENCES: [string, string][] = [
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["four_monthly", "Every 4 months"],
  ["annual", "Annual"],
  ["times_per_year", "N× / year"],
  ["one_off", "One-off"],
];
const CURRENCIES = ["EUR", "RON", "USD", "GBP"];

const typeLabel = (t: string) => TYPES.find(([v]) => v === t)?.[1] ?? t;
const cadenceLabel = (c: string) => CADENCES.find(([v]) => v === c)?.[1] ?? c;

export function ClientsClient({ model }: { model: ClientsModel }) {
  const readonly = useReadonly();
  const { money } = useCurrency();
  const [adding, setAdding] = useState(false);

  return (
    <div className="animate-fade-up space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="MRR (active)" value={<span className="tnum">{money(model.totalMrrEur)}</span>} />
        <StatCard label="ARR (active)" value={<span className="tnum">{money(model.totalArrEur)}</span>} />
        <StatCard label="Active clients" value={<span className="tnum">{model.activeCount}</span>} sub={`${money(model.totalOneOffEur)} one-off booked`} />
      </div>

      {model.renewals.length > 0 && <RenewalsStrip renewals={model.renewals} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">{model.clients.length} client{model.clients.length === 1 ? "" : "s"}</p>
        {!readonly && (
          <button onClick={() => setAdding(true)} className="focusring flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-black hover:brightness-110">
            <Plus size={15} /> Add client
          </button>
        )}
      </div>

      {model.clients.length === 0 ? (
        <EmptyState message="No clients yet. Add one, then add its service lines (retainer, hosting, scoped work…)." />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {model.clients.map((c) => <ClientCard key={c.id} client={c} />)}
        </div>
      )}

      {adding && <ClientForm onClose={() => setAdding(false)} />}
    </div>
  );
}

function RenewalsStrip({ renewals }: { renewals: ClientsModel["renewals"] }) {
  const { money } = useCurrency();
  return (
    <Card>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <CalendarClock size={15} className="text-accent" /> Renewals due soon
      </div>
      <div className="space-y-1.5">
        {renewals.map((r, i) => {
          const when = r.daysUntil < 0 ? `${Math.abs(r.daysUntil)}d overdue` : r.daysUntil === 0 ? "due today" : `in ${r.daysUntil}d`;
          return (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-panel px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Badge tone={r.daysUntil < 0 ? "loss" : "amber"}>{when}</Badge>
                <span className="font-medium">{r.clientName}</span>
                <span className="text-ink-faint">{typeLabel(r.type)}{r.label ? ` · ${r.label}` : ""}</span>
              </span>
              <span className="tnum">{money(r.amountEur)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ClientCard({ client }: { client: ClientView }) {
  const readonly = useReadonly();
  const { money } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [addingService, setAddingService] = useState(false);
  const [editingService, setEditingService] = useState<ServiceLine | null>(null);
  const [pending, start] = useTransition();

  const statusTone = client.status === "active" ? "gain" : client.status === "paused" ? "amber" : "neutral";

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{client.name}</h3>
            <Badge tone={statusTone}>{client.status}</Badge>
          </div>
          <div className="mt-1 text-2xl font-semibold tnum">{money(client.mrrEur)}<span className="ml-1 text-sm font-normal text-ink-faint">/mo</span></div>
          <div className="mt-0.5 text-xs text-ink-faint">{money(client.arrEur)} ARR{client.oneOffEur > 0 ? ` · ${money(client.oneOffEur)} one-off` : ""}</div>
        </div>
        {!readonly && (
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} className="focusring rounded p-1.5 text-ink-faint hover:bg-hover hover:text-ink"><Pencil size={14} /></button>
            <button onClick={() => { if (confirm(`Delete client "${client.name}"?`)) start(async () => { await deleteClient(client.id); }); }} disabled={pending} className="focusring rounded p-1.5 text-ink-faint hover:bg-hover hover:text-loss"><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        {client.services.length === 0 ? (
          <p className="text-xs text-ink-faint">No service lines yet.</p>
        ) : (
          client.services.map((s) => (
            <div key={s.id} className={`flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm ${s.active ? "" : "opacity-50"}`}>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <Badge tone="accent">{typeLabel(s.type)}</Badge>
                  {s.label && <span className="truncate text-ink-muted">{s.label}</span>}
                  {!s.active && <span className="text-xs text-ink-faint">paused</span>}
                </span>
                <span className="mt-0.5 block text-xs text-ink-faint">
                  {s.type === "hourly" && s.hours != null && s.rate != null
                    ? `${s.hours}h × ${s.rate.toLocaleString("en-US")} ${s.currency}`
                    : `${s.amount.toLocaleString("en-US")} ${s.currency}`}
                  {" · "}{cadenceLabel(s.cadence)}{s.cadence === "times_per_year" && s.timesPerYear ? ` (${s.timesPerYear}×)` : ""}
                  {s.renewalDate ? ` · renews ${s.renewalDate}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="tnum text-ink-muted">{s.monthlyEur > 0 ? `${money(s.monthlyEur)}/mo` : s.oneOffEur > 0 ? money(s.oneOffEur) : "—"}</span>
                {!readonly && (
                  <span className="flex gap-1">
                    <button onClick={() => setEditingService(s)} className="focusring rounded p-1 text-ink-faint hover:bg-hover hover:text-ink"><Pencil size={12} /></button>
                    <button onClick={() => start(async () => { await deleteClientService(s.id); })} disabled={pending} className="focusring rounded p-1 text-ink-faint hover:text-loss"><Trash2 size={12} /></button>
                  </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      {!readonly && (
        <button onClick={() => setAddingService(true)} className="focusring mt-3 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-hover">
          <Plus size={13} /> Add service line
        </button>
      )}

      {client.notes && <p className="mt-3 text-xs text-ink-faint">{client.notes}</p>}

      {editing && <ClientForm initial={client} onClose={() => setEditing(false)} />}
      {(addingService || editingService) && (
        <ServiceForm
          clientId={client.id}
          defaultCurrency={client.currency}
          initial={editingService ?? undefined}
          onClose={() => { setAddingService(false); setEditingService(null); }}
        />
      )}
    </Card>
  );
}

function ClientForm({ initial, onClose }: { initial?: ClientView; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = Object.fromEntries(new FormData(e.currentTarget).entries());
    start(async () => {
      const res = await upsertClient(initial?.id ?? null, input);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }
  return (
    <Modal open onClose={onClose} title={initial ? "Edit client" : "Add client"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name"><input name="name" required defaultValue={initial?.name ?? ""} className={inputClass} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select name="status" defaultValue={initial?.status ?? "active"} className={inputClass}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="churned">Churned</option>
            </select>
          </Field>
          <Field label="Currency">
            <select name="currency" defaultValue={initial?.currency ?? "EUR"} className={inputClass}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes"><input name="notes" defaultValue={initial?.notes ?? ""} className={inputClass} /></Field>
        {error && <p className="text-sm text-loss">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="focusring rounded-lg border border-border px-4 py-2 text-sm hover:bg-hover">Cancel</button>
          <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

function ServiceForm({
  clientId,
  defaultCurrency,
  initial,
  onClose,
}: {
  clientId: number;
  defaultCurrency: string;
  initial?: ServiceLine;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(initial?.type ?? "monthly_retainer");
  const [cadence, setCadence] = useState(initial?.cadence ?? "monthly");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = { ...Object.fromEntries(fd.entries()), clientId, active: fd.get("active") === "on" };
    start(async () => {
      const res = await upsertClientService(initial?.id ?? null, input);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <Modal open onClose={onClose} title={initial ? "Edit service line" : "Add service line"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Cadence">
            <select name="cadence" value={cadence} onChange={(e) => setCadence(e.target.value)} className={inputClass}>
              {CADENCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Description (optional)"><input name="label" defaultValue={initial?.label ?? ""} placeholder="e.g. SEO retainer, annual SSL hosting" className={inputClass} /></Field>

        {type === "hourly" ? (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Hours"><input name="hours" type="number" step="any" defaultValue={initial?.hours ?? ""} className={inputClass} /></Field>
            <Field label="Rate"><input name="rate" type="number" step="any" defaultValue={initial?.rate ?? ""} className={inputClass} /></Field>
            <Field label="Currency">
              <select name="currency" defaultValue={initial?.currency ?? defaultCurrency} className={inputClass}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount"><input name="amount" type="number" step="any" defaultValue={initial?.amount ?? ""} className={inputClass} /></Field>
            <Field label="Currency">
              <select name="currency" defaultValue={initial?.currency ?? defaultCurrency} className={inputClass}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {cadence === "times_per_year" && (
            <Field label="Times per year"><input name="timesPerYear" type="number" defaultValue={initial?.timesPerYear ?? 2} className={inputClass} /></Field>
          )}
          <Field label="Renewal / next date"><input name="renewalDate" type="date" defaultValue={initial?.renewalDate ?? ""} className={inputClass} /></Field>
          <Field label="Start date"><input name="startDate" type="date" defaultValue={initial?.startDate ?? ""} className={inputClass} /></Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="accent-accent" /> Active (counts toward MRR)
        </label>

        {/* For hourly, send a 0 amount so the schema is satisfied; value derives from hours×rate. */}
        {type === "hourly" && <input type="hidden" name="amount" value="0" />}

        {error && <p className="text-sm text-loss">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="focusring rounded-lg border border-border px-4 py-2 text-sm hover:bg-hover">Cancel</button>
          <button type="submit" disabled={pending} className="focusring rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
