import Link from "next/link";
import { Importer } from "@/components/import/Importer";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Import data</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Bring a CSV or Excel export from your bank, broker or spreadsheet.
          Prefer to type it in?{" "}
          <Link href="/dashboard/holdings" className="text-accent hover:underline">
            Add holdings
          </Link>
          ,{" "}
          <Link href="/dashboard/real-estate" className="text-accent hover:underline">
            property
          </Link>
          ,{" "}
          <Link href="/dashboard/loans" className="text-accent hover:underline">
            loans
          </Link>{" "}
          and more by hand from their pages.
        </p>
      </header>
      <Importer />
    </div>
  );
}
