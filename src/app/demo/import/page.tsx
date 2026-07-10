import { Upload, Wand2, Eye, Check } from "lucide-react";

const STEPS = [
  { icon: Upload, title: "Upload", body: "Drop a CSV or Excel export — parsed in your browser." },
  { icon: Wand2, title: "Map", body: "Columns are auto-matched; tweak any that need it." },
  { icon: Eye, title: "Preview", body: "See exactly what will be added before anything saves." },
  { icon: Check, title: "Commit", body: "Import per asset class into your own database." },
];

// A read-only illustration of the importer for the public /demo (the real
// importer writes to your DB, so it isn't wired up in the demo).
const SAMPLE = [
  { symbol: "AAPL", qty: "60", cost: "$165.60", date: "2025-10-02" },
  { symbol: "VOO", qty: "25", cost: "$423.36", date: "2025-02-05" },
  { symbol: "BTC-USD", qty: "0.45", cost: "$37,920", date: "2024-11-10" },
];

export default function DemoImportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Import data</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Bring a CSV or Excel export from any bank, broker or spreadsheet. Everything is
          parsed in your browser — nothing leaves your device until you commit it to your own
          database.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-xl border border-border bg-panel p-4">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
                <s.icon size={16} />
              </div>
              <span className="text-xs font-medium text-ink-faint">Step {i + 1}</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-ink">{s.title}</div>
            <p className="mt-0.5 text-xs text-ink-muted">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-panel p-4">
        <div className="stat-label mb-3">Preview · holdings.csv → US Stocks</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint">
                <th className="py-1.5 font-medium">Symbol</th>
                <th className="py-1.5 text-right font-medium">Quantity</th>
                <th className="py-1.5 text-right font-medium">Unit cost</th>
                <th className="py-1.5 text-right font-medium">Trade date</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.map((r) => (
                <tr key={r.symbol} className="border-t border-border/50">
                  <td className="py-2 font-medium text-ink">{r.symbol}</td>
                  <td className="py-2 text-right text-ink-muted">{r.qty}</td>
                  <td className="py-2 text-right text-ink-muted">{r.cost}</td>
                  <td className="py-2 text-right text-ink-muted">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        This is a read-only demo. Deploy your own NomadWealth to import real data — it commits
        straight into your Neon database, never ours.
      </p>
    </div>
  );
}
