"use client";

/**
 * Web importer (P0-2): upload CSV/Excel → map columns → preview → commit.
 * Parsing happens in the browser (privacy); only the mapped rows are sent, on
 * commit, to the buyer's own database. Replaces the hardcoded scripts/import.ts.
 */
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Upload, FileSpreadsheet, Check, ArrowRight } from "lucide-react";
import {
  IMPORT_ASSET_CLASSES,
  specFor,
  type ImportAssetClass,
} from "@/lib/import-fields";
import { parseSpreadsheet, FIELD_SYNONYMS, type ParsedSheet } from "@/lib/import-preview";

type Mapping = Record<string, string>; // csv header -> field ("" = ignore)

// Example values for the downloadable per-class CSV template, keyed by field.
const TEMPLATE_EXAMPLES: Record<string, string> = {
  symbol: "AAPL",
  quantity: "10",
  unitCost: "168.40",
  costCurrency: "USD",
  currentPrice: "172.10",
  assetClass: "us_stock",
  direction: "buy",
  tradeDate: "2024-03-11",
  name: "City apartment",
  value: "145000",
  currency: "EUR",
  monthlyRent: "650",
  purchaseDate: "2022-04-01",
  purchasePrice: "118000",
  borrower: "John Doe",
  principal: "10000",
  interestRate: "6",
  startDate: "2024-01-15",
  termMonths: "36",
  balance: "8500",
  type: "personal_cash",
  valuation: "50000",
  startedOn: "2021-06-01",
  payDate: "2024-05-10",
  netAmount: "42.50",
  amountPerShare: "0.24",
  note: "",
  notes: "",
};

function downloadTemplate(spec: ReturnType<typeof specFor>) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv =
    spec.fields.map(esc).join(",") +
    "\n" +
    spec.fields.map((f) => esc(TEMPLATE_EXAMPLES[f] ?? "")).join(",") +
    "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nomadwealth-${spec.value}-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function autoMap(headers: string[], fields: string[]): Mapping {
  const map: Mapping = {};
  for (const h of headers) {
    const hl = h.trim().toLowerCase().replace(/[_-]/g, " ");
    const field = fields.find((f) =>
      (FIELD_SYNONYMS[f] ?? [f]).some((s) => hl === s || hl.includes(s)),
    );
    map[h] = field ?? "";
  }
  return map;
}

export function Importer() {
  const [assetClass, setAssetClass] = useState<ImportAssetClass>("holdings");
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Mapping>({});
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const spec = specFor(assetClass);

  const normalizedRows = useMemo(() => {
    if (!sheet) return [];
    return sheet.rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [csv, field] of Object.entries(mapping)) {
        if (field) out[field] = row[csv];
      }
      return out;
    });
  }, [sheet, mapping]);

  const validCount = useMemo(
    () =>
      normalizedRows.filter((r) =>
        spec.required.every((f) => {
          const v = r[f];
          return v !== undefined && v !== null && String(v).trim() !== "";
        }),
      ).length,
    [normalizedRows, spec],
  );

  async function ingestFile(file: File) {
    setError(null);
    setCommitted(null);
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
      setError(
        `"${file.name}" isn't a supported format — export as .csv, .xlsx or .xls and try again.`,
      );
      return;
    }
    try {
      const parsed = await parseSpreadsheet(file);
      if (parsed.headers.length === 0) {
        setError(
          "That file parsed but has no readable rows — check that the first row contains column headers.",
        );
        return;
      }
      setSheet(parsed);
      setFileName(file.name);
      setMapping(autoMap(parsed.headers, spec.fields));
    } catch {
      setError(
        "Could not read that file. If it's password-protected or an unusual export, re-save it as a plain .csv and try again.",
      );
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await ingestFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void ingestFile(file);
  }

  function changeAssetClass(next: ImportAssetClass) {
    setAssetClass(next);
    setCommitted(null);
    if (sheet) setMapping(autoMap(sheet.headers, specFor(next).fields));
  }

  async function commit() {
    setCommitting(true);
    setError(null);
    try {
      const create = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetClass, rows: normalizedRows }),
      }).then((r) => r.json());
      if (!create.jobId) throw new Error(create.error ?? "Could not start import.");

      const res = await fetch(`/api/import/${create.jobId}/commit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: normalizedRows }),
      }).then((r) => r.json());
      if (typeof res.committed !== "number") {
        throw new Error(res.error ?? "Commit failed.");
      }
      setCommitted(res.committed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setCommitting(false);
    }
  }

  if (committed !== null) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
          <Check size={22} />
        </div>
        <h2 className="text-lg font-semibold text-ink">
          Imported {committed} {spec.label.toLowerCase()}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Your rows are now in your database. Heads-up: importing the same file
          again will create duplicates — anything mis-imported can be removed
          from Trash.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="focusring rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-black transition hover:brightness-110"
          >
            Go to dashboard
          </Link>
          <button
            onClick={() => {
              setSheet(null);
              setFileName("");
              setCommitted(null);
            }}
            className="focusring rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-hover"
          >
            Import more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Asset class */}
      <section className="card p-5">
        <h2 className="stat-label mb-3">1 · What are you importing?</h2>
        <div className="flex flex-wrap gap-2">
          {IMPORT_ASSET_CLASSES.map((a) => (
            <button
              key={a.value}
              onClick={() => changeAssetClass(a.value)}
              aria-pressed={assetClass === a.value}
              className={
                "focusring rounded-xl border px-3.5 py-2 text-sm font-medium transition " +
                (assetClass === a.value
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-panel text-ink-muted hover:bg-hover")
              }
            >
              {a.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-faint">{spec.hint}</p>
      </section>

      {/* Upload */}
      <section className="card p-5">
        <h2 className="stat-label mb-3">2 · Upload a file</h2>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="sr-only"
          onChange={onPickFile}
        />
        <button
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={
            "focusring flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition " +
            (dragging
              ? "border-accent bg-accent/10"
              : "border-accent/40 bg-accent/5 hover:bg-accent/10")
          }
        >
          {fileName ? (
            <>
              <FileSpreadsheet className="text-accent" size={24} />
              <span className="tnum text-sm font-medium text-ink">{fileName}</span>
              <span className="text-xs text-ink-muted">
                {sheet?.rows.length ?? 0} rows · click or drop to replace
              </span>
            </>
          ) : (
            <>
              <Upload className="text-accent" size={24} />
              <span className="text-sm font-medium text-ink">
                Drag &amp; drop, or click to choose CSV / Excel
              </span>
              <span className="text-xs text-ink-muted">
                Parsed in your browser — nothing leaves your device until you commit.
              </span>
            </>
          )}
        </button>
        <p className="mt-3 text-xs text-ink-faint">
          Not sure about the shape?{" "}
          <button
            onClick={() => downloadTemplate(spec)}
            className="focusring text-accent underline-offset-2 hover:underline"
          >
            Download a {spec.label.toLowerCase()} template
          </button>{" "}
          with the expected columns and an example row.
        </p>
      </section>

      {/* Mapping + preview */}
      {sheet && (
        <>
          <section className="card p-5">
            <h2 className="stat-label mb-3">3 · Map columns → fields</h2>
            <div className="overflow-hidden rounded-xl border border-border">
              {sheet.headers.map((h, i) => (
                <div
                  key={h}
                  className={
                    "grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 " +
                    (i % 2 ? "bg-panel" : "bg-raised")
                  }
                >
                  <span className="tnum truncate text-sm text-ink">{h}</span>
                  <ArrowRight size={14} className="text-ink-faint" />
                  <select
                    value={mapping[h] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [h]: e.target.value }))
                    }
                    className="focusring rounded-lg border border-border bg-base px-2.5 py-1.5 text-sm text-ink"
                  >
                    <option value="">— ignore —</option>
                    {spec.fields.map((f) => (
                      <option key={f} value={f}>
                        {f}
                        {spec.required.includes(f) ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              <span className="text-accent">*</span> required. Rows missing a
              required field are skipped.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="stat-label mb-3">4 · Preview</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {spec.fields
                      .filter((f) => Object.values(mapping).includes(f))
                      .map((f) => (
                        <th
                          key={f}
                          className="whitespace-nowrap px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-faint"
                        >
                          {f}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {normalizedRows.slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      {spec.fields
                        .filter((f) => Object.values(mapping).includes(f))
                        .map((f) => (
                          <td key={f} className="tnum whitespace-nowrap px-3 py-2 text-ink-muted">
                            {row[f] === undefined || row[f] === null
                              ? "—"
                              : String(row[f])}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-muted">
                {validCount} of {normalizedRows.length} rows ready to import
              </p>
              <button
                onClick={commit}
                disabled={committing || validCount === 0}
                className="focusring rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {committing ? "Importing…" : `Import ${validCount} rows`}
              </button>
            </div>
          </section>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-loss">
          {error}
        </p>
      )}
    </div>
  );
}
