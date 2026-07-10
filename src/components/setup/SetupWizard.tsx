"use client";

/**
 * First-run setup wizard (P0-1) — replaces the CLI. Three steps:
 *   1. Neon  → verify DATABASE_URL + run migrations programmatically
 *   2. License & password → activate a key (offline) + set the owner password
 *   3. Import → upload a CSV/Excel (client-side preview) or start manually
 * Finishing writes app_config, signs the owner session, and opens the cockpit.
 *
 * Matches design-exports/screenshots/03-setup-desktop.png and the prototype.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Database, KeyRound, Download, Upload, PencilLine } from "lucide-react";
import { Button, Card, TextField } from "@/components/nw/primitives";
import { autoMapColumns, parseSpreadsheet, type MappedPreview } from "@/lib/import-preview";

type StepId = 0 | 1 | 2;
const STEPS = [
  { id: 0, label: "Neon" },
  { id: 1, label: "License" },
  { id: 2, label: "Import" },
] as const;

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(0);

  // Step 1 — Neon
  const [envDbHint, setEnvDbHint] = useState<string | null>(null);
  const [neonStr, setNeonStr] = useState("");
  const [neonTesting, setNeonTesting] = useState(false);
  const [neonConnected, setNeonConnected] = useState(false);
  const [neonMsg, setNeonMsg] = useState<string | null>(null);
  const [neonError, setNeonError] = useState<string | null>(null);

  // Step 2 — License & password
  const [licenseStr, setLicenseStr] = useState("");
  const [licActivating, setLicActivating] = useState(false);
  const [licActive, setLicActive] = useState(false);
  const [licTier, setLicTier] = useState<string>("");
  const [licError, setLicError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [savingOwner, setSavingOwner] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  // Step 3 — Import
  const [importMode, setImportMode] = useState<"upload" | "manual" | null>(null);
  const [preview, setPreview] = useState<MappedPreview | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((d: { databaseHint: string | null }) => setEnvDbHint(d.databaseHint))
      .catch(() => {});
  }, []);

  async function testConnection() {
    setNeonTesting(true);
    setNeonError(null);
    setNeonMsg(null);
    try {
      const body = envDbHint ? {} : { databaseUrl: neonStr };
      const vr = await fetch("/api/setup/verify-db", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!vr.connected) {
        setNeonError(vr.error ?? "Could not connect to the database.");
        return;
      }
      const mr = await fetch("/api/setup/migrate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!mr.ok) {
        setNeonError(mr.error ?? "Migrations failed.");
        return;
      }
      setNeonConnected(true);
      setNeonMsg("Connected · schema migrated");
    } catch (e) {
      setNeonError(e instanceof Error ? e.message : "Network error");
    } finally {
      setNeonTesting(false);
    }
  }

  async function activateLicense() {
    setLicActivating(true);
    setLicError(null);
    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: licenseStr }),
      }).then((r) => r.json());
      if (!res.valid) {
        setLicError(res.error ?? "Could not activate this key.");
        setLicActive(false);
        return;
      }
      // A trial/empty key is not enough to finish setup — a purchased key is
      // required (the server enforces this too; this is the friendly heads-up).
      if (res.tier === "trial") {
        setLicError(
          "That looks like a trial or empty key. Enter the license key emailed after your purchase to finish setup.",
        );
        setLicActive(false);
        return;
      }
      setLicActive(true);
      setLicTier(res.tier);
    } catch (e) {
      setLicError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLicActivating(false);
    }
  }

  async function saveOwnerAndAdvance() {
    setSavingOwner(true);
    setOwnerError(null);
    try {
      const res = await fetch("/api/owner", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, email: email || undefined }),
      }).then((r) => r.json());
      if (!res.ok) {
        setOwnerError(res.error ?? "Could not set the password.");
        return;
      }
      setStep(2);
    } catch (e) {
      setOwnerError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSavingOwner(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseSpreadsheet(file);
      setPreview(autoMapColumns(file.name, rows));
      setImportMode("upload");
    } catch {
      setPreview(null);
    }
  }

  async function finish() {
    setFinishing(true);
    setFinishError(null);
    try {
      const res = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }).then((r) => r.json());
      if (!res.ok) {
        setFinishError(res.error ?? "Could not finish setup.");
        setFinishing(false);
        return;
      }
      router.replace(importMode === "upload" ? "/dashboard/import" : "/dashboard");
      router.refresh();
    } catch (e) {
      setFinishError(e instanceof Error ? e.message : "Network error");
      setFinishing(false);
    }
  }

  const canContinue =
    step === 0
      ? neonConnected
      : step === 1
        ? licActive && password.length >= 8 && password === confirm
        : importMode !== null;

  function onContinue() {
    if (step === 0) setStep(1);
    else if (step === 1) saveOwnerAndAdvance();
    else finish();
  }

  return (
    <div className="mx-auto max-w-[680px] px-5 pb-24 pt-12">
      <div className="mb-8 text-center">
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-text">
          Set up NomadWealth
        </h1>
        <p className="mt-2.5 text-muted">
          Three steps and your cockpit is live. This all runs on your infrastructure.
        </p>
      </div>

      {/* stepper */}
      <ol className="mb-7 flex items-center gap-2" aria-label="Setup progress">
        {STEPS.map((s) => {
          const done = s.id < step;
          const current = s.id === step;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <span
                aria-current={current ? "step" : undefined}
                className="grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold"
                style={{
                  background: done
                    ? "var(--nw-gain)"
                    : current
                      ? "var(--accent)"
                      : "var(--line)",
                  color: done || current ? "#0f1115" : "var(--dim)",
                }}
              >
                {done ? <Check size={15} /> : s.id + 1}
              </span>
              <span
                className="text-[14px] font-medium"
                style={{ color: current || done ? "var(--text)" : "var(--dim)" }}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      <Card className="border-line-strong p-7" style={{ borderRadius: 16 }}>
        {step === 0 && (
          <StepShell
            icon={<Database size={16} />}
            iconColor="var(--neon)"
            title="Connect your Neon database"
            desc={
              <>
                Paste the connection string from your Neon project. We run
                migrations automatically — tables are created in{" "}
                <span className="mono text-text-2">your</span> database, never
                ours.
              </>
            }
          >
            <label className="mb-2 block text-[13px] text-muted">
              Postgres connection string
            </label>
            {envDbHint ? (
              <div className="rounded-md border border-line-strong bg-input px-3.5 py-3">
                <p className="mono text-[13px] text-text-2">{envDbHint}</p>
                <p className="mt-1 text-[12px] text-dim">
                  Detected from your environment (DATABASE_URL).
                </p>
              </div>
            ) : (
              <TextField
                mono
                value={neonStr}
                onChange={(e) => setNeonStr(e.target.value)}
                placeholder="postgresql://user:****@ep-cool-lab.eu-central-1.aws.neon.tech/neondb"
                aria-label="Postgres connection string"
              />
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={testConnection}
                disabled={neonTesting || (!envDbHint && neonStr.trim().length === 0)}
              >
                {neonTesting ? "Testing…" : neonConnected ? "Re-test" : "Test connection"}
              </Button>
              {neonMsg && (
                <span className="flex items-center gap-1.5 text-[14px] text-[color:var(--nw-gain)]">
                  <Check size={15} /> {neonMsg}
                </span>
              )}
            </div>
            {neonError && <ErrorLine>{neonError}</ErrorLine>}
          </StepShell>
        )}

        {step === 1 && (
          <StepShell
            icon={<KeyRound size={16} />}
            iconColor="var(--accent)"
            title="Activate your license & set a password"
            desc="Paste the license key from your purchase email — activation is offline, no phone-home. A valid key is required to finish setup. Then choose the password you'll use to unlock this dashboard."
          >
            <label className="mb-2 block text-[13px] text-muted">License key</label>
            <TextField
              mono
              value={licenseStr}
              onChange={(e) => setLicenseStr(e.target.value)}
              placeholder="NW1.xxxxxxxx…"
              aria-label="License key"
              style={{ letterSpacing: "0.03em" }}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={activateLicense} disabled={licActivating}>
                {licActivating ? "Activating…" : licActive ? "Re-activate" : "Activate"}
              </Button>
              {licActive && (
                <span className="text-[14px] text-[color:var(--nw-gain)]">
                  ✓ Activated · {licTier === "updates" ? "license + updates" : "self-host license"}
                </span>
              )}
            </div>
            {licError && <ErrorLine>{licError}</ErrorLine>}

            <div className="mt-6 border-t border-line pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[13px] text-muted">
                    Dashboard password
                  </label>
                  <TextField
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[13px] text-muted">
                    Confirm password
                  </label>
                  <TextField
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-[13px] text-muted">
                  Recovery email <span className="text-dim">(optional)</span>
                </label>
                <TextField
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              {confirm.length > 0 && password !== confirm && (
                <ErrorLine>Passwords don&apos;t match.</ErrorLine>
              )}
              {ownerError && <ErrorLine>{ownerError}</ErrorLine>}
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell
            icon={<Download size={16} />}
            iconColor="var(--step-import)"
            title="Import your data"
            desc="Bring a CSV or Excel export from your bank, broker or spreadsheet — or start from an empty cockpit and add assets by hand."
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="sr-only"
              onChange={onFile}
            />
            {!preview ? (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <ChoiceTile
                  accent
                  icon={<Upload size={22} />}
                  title="Upload CSV / Excel"
                  hint="Drag a file or click to browse"
                  onClick={() => fileRef.current?.click()}
                />
                <ChoiceTile
                  icon={<PencilLine size={22} />}
                  title="Start manually"
                  hint="Add your first asset by hand"
                  active={importMode === "manual"}
                  onClick={() => setImportMode("manual")}
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between rounded-md border border-line-strong bg-input px-3.5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[color:var(--nw-gain)]">▤</span>
                    <span className="mono text-[13px] text-text">{preview.fileName}</span>
                    <span className="text-[12px] text-dim">· {preview.rowCount} rows</span>
                  </div>
                  <span className="text-[12px] text-[color:var(--nw-gain)]">parsed ✓</span>
                </div>
                <p className="my-3 text-[13px] text-muted">
                  Map your columns → NomadWealth fields
                </p>
                <div className="overflow-hidden rounded-md border border-line">
                  {preview.rows.map((m, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-hair px-3.5 py-3 last:border-b-0"
                    >
                      <span className="mono text-[13px] text-text-2">{m.csv}</span>
                      <span className="text-dim">→</span>
                      <span
                        className={
                          m.field
                            ? "text-[13px] text-[color:var(--nw-gain)]"
                            : "text-[13px] italic text-dim"
                        }
                      >
                        {m.field ?? "ignored"}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className="mt-3 text-[13px] text-muted underline-offset-2 hover:text-text hover:underline"
                  onClick={() => {
                    setPreview(null);
                    setImportMode(null);
                  }}
                >
                  Choose a different file
                </button>
              </div>
            )}
            {finishError && <ErrorLine>{finishError}</ErrorLine>}
          </StepShell>
        )}

        {/* nav */}
        <div className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-6">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => (s > 0 ? ((s - 1) as StepId) : s))}
            disabled={step === 0}
          >
            ← Back
          </Button>
          <Button onClick={onContinue} disabled={!canContinue || savingOwner || finishing}>
            {step === 2
              ? finishing
                ? "Opening cockpit…"
                : "Finish & open cockpit"
              : savingOwner
                ? "Saving…"
                : "Continue"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------- subcomponents */
function StepShell({
  icon,
  iconColor,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  desc: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fx-fadeup">
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-[30px] w-[30px] place-items-center rounded-md"
          style={{ background: `color-mix(in srgb, ${iconColor} 14%, transparent)`, color: iconColor }}
        >
          {icon}
        </span>
        <h2 className="text-[19px] font-semibold text-text">{title}</h2>
      </div>
      <p className="my-4 text-[14px] leading-relaxed text-muted">{desc}</p>
      {children}
    </div>
  );
}

function ChoiceTile({
  icon,
  title,
  hint,
  accent,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  accent?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-btn px-4 py-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)] " +
        (accent
          ? "border-[1.5px] border-dashed border-[color:var(--accent-ring)] bg-[color:var(--accent-tint-2)] hover:bg-[color:var(--accent-tint)]"
          : active
            ? "border border-brand bg-[color:var(--accent-tint-2)]"
            : "border border-line-strong hover:bg-[color:var(--hair)]")
      }
    >
      <div className="mb-2 grid place-items-center text-text">{icon}</div>
      <div className="text-[15px] font-semibold text-text">{title}</div>
      <div className="mt-1.5 text-[12px] text-muted">{hint}</div>
    </button>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-3 text-[13px] text-[color:var(--nw-loss)]">
      {children}
    </p>
  );
}
