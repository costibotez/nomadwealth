/**
 * Re-seed just the cash accounts + StockEstate/Roland loans (§7) without
 * re-importing the spreadsheets. Idempotent.
 *   pnpm seed:accounts
 */
import { seedExtras } from "./seed-data";

seedExtras()
  .then((s) => {
    console.log(`✅ Seeded ${s.accounts} accounts and ${s.extraLoans} loans.`);
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  });
