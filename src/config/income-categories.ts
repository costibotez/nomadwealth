/**
 * Income categories for the Cash Flow "Legend". Each distinct source from the
 * Venituri tab can be tagged with one of these. `startup_income` lets you name
 * the specific startup via a custom label.
 */
export interface IncomeCategory {
  key: string;
  label: string;
  color: string;
}

export const INCOME_CATEGORIES: IncomeCategory[] = [
  { key: "retainer", label: "Monthly retainer / subscription", color: "#ff7a18" },
  { key: "one_off_client", label: "One-off client", color: "#5b8def" },
  { key: "dividend", label: "Dividend", color: "#3ddc97" },
  { key: "mutual_funds", label: "Mutual funds income", color: "#4cc9c0" },
  { key: "crypto_staking", label: "Crypto staking", color: "#9b8cff" },
  { key: "hosting", label: "Hosting", color: "#c77dff" },
  { key: "affiliate", label: "Affiliate", color: "#f5c451" },
  { key: "rent", label: "Rent", color: "#8aa0b8" },
  { key: "loan", label: "Loan repayment", color: "#6d8bb0" },
  { key: "poker", label: "Poker", color: "#e0697f" },
  { key: "rummy", label: "Rummy", color: "#d98a5b" },
  { key: "bank_deposit", label: "Bank deposit interest", color: "#7fb069" },
  { key: "vinted", label: "Vinted", color: "#5fb0c0" },
  { key: "startup_income", label: "Personal startup income", color: "#ff9d5c" },
  { key: "other", label: "Other / untagged", color: "#5c6675" },
];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  INCOME_CATEGORIES.map((c) => [c.key, c.label]),
);
export const CATEGORY_COLOR: Record<string, string> = Object.fromEntries(
  INCOME_CATEGORIES.map((c) => [c.key, c.color]),
);
