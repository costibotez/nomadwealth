/** Marketing copy — lifted verbatim from the approved design export. */
import {
  Database,
  Triangle,
  KeyRound,
  TrendingUp,
  Globe2,
  Building2,
  ShieldCheck,
} from "lucide-react";

/**
 * Typewriter tail for the benefit-led hero headline. The static part reads
 * "Your entire net worth — not just" and these complete it, cycling through the
 * asset classes NomadWealth tracks that a plain brokerage app can't.
 */
export const TYPED_WORDS = [
  "your stocks.",
  "your property.",
  "your private loans.",
  "your business.",
];

/**
 * "Who it's for" — persona lines so the visitor self-identifies. The ICP is the
 * technically-comfortable, privacy-conscious DIY investor with a messy
 * multi-asset balance sheet who has outgrown spreadsheets.
 */
export const WHO_ITS_FOR = [
  {
    icon: TrendingUp,
    title: "The DIY investor who outgrew the spreadsheet",
    body: "You've tracked everything by hand across tabs and formulas that break. You want one honest number without giving up control.",
  },
  {
    icon: Globe2,
    title: "The expat or nomad with assets across borders",
    body: "Accounts, property and income in different countries and currencies. You want the whole picture in the one currency you actually think in.",
  },
  {
    icon: Building2,
    title: "The one tracking more than a brokerage",
    body: "A rental or two, private loans you've made, cash inside a small business — not just tickers. NomadWealth counts all of it as net worth.",
  },
  {
    icon: ShieldCheck,
    title: "The privacy-conscious, post-Mint holdout",
    body: "You won't hand a cloud aggregator your bank logins. Self-hosted on your own Vercel and Neon means the data is only ever yours.",
  },
];

export const OWN_DATA = [
  {
    icon: Database,
    title: "Your Neon Postgres",
    body: "Every figure is stored in a database you own and control. Revoke our access any time — there was never any.",
  },
  {
    icon: Triangle,
    title: "Your Vercel deploy",
    body: "One-click deploy to your own project. Updates ship as pull requests you choose to merge.",
  },
  {
    icon: KeyRound,
    title: "Your API keys",
    body: "Bring your own price-data key for quotes and alerts. Nothing routes through our servers.",
  },
];

export const FEATURES = [
  { tag: "MULTI-CURRENCY", title: "EUR · USD · GBP · RON", body: "Hold assets in any currency; see net worth in the one you think in. Live FX applied everywhere." },
  { tag: "MULTI-ASSET", title: "Beyond just stocks", body: "Public holdings, real estate, private loans receivable, cash and business income in one model." },
  { tag: "FIRE", title: "Projection you can steer", body: "Forward net-worth model with editable savings, return and target — and read-only share links." },
  { tag: "ONBOARDING", title: "CSV & Excel import", body: "Map columns from any bank or broker export, or add assets by hand. Guided empty states throughout." },
  { tag: "WATCHLIST", title: "Alerts, your keys", body: "Track tickers and set price alerts using your own market-data API key." },
  { tag: "SETUP", title: "First-run wizard", body: "Auto-migrations, Neon connect and license activation — cockpit live in minutes." },
];

export const COMPARE_ROWS = [
  { label: "Self-hosted", us: "✓", cloud: "✕", ghost: "✓" },
  { label: "Your data stays yours", us: "✓", cloud: "✕", ghost: "✓" },
  { label: "Public holdings", us: "✓", cloud: "✓", ghost: "✓" },
  { label: "Real estate", us: "✓", cloud: "~", ghost: "✕" },
  { label: "Private loans receivable", us: "✓", cloud: "✕", ghost: "✕" },
  { label: "Business income", us: "✓", cloud: "~", ghost: "✕" },
  { label: "First-class multi-currency", us: "✓", cloud: "~", ghost: "~" },
  { label: "FIRE projection", us: "✓", cloud: "✕", ghost: "✕" },
  { label: "One-time price", us: "✓", cloud: "✕", ghost: "✓" },
];

/**
 * Stripe Payment Links. Env-overridable so they can be rotated without a code
 * change; defaults are the live links. Payment is separate from license-key
 * delivery — keys are signed offline and emailed after purchase (see README).
 */
export const STRIPE_SELFHOST_URL =
  process.env.NEXT_PUBLIC_STRIPE_SELFHOST_URL ??
  "https://buy.stripe.com/14AfZhbuv6nMcmZ6uOgrS0G";
export const STRIPE_RENEW_URL =
  process.env.NEXT_PUBLIC_STRIPE_RENEW_URL ??
  "https://buy.stripe.com/5kQfZhfKLaE24UxcTcgrS0H";
export const STRIPE_HOSTED_URL =
  process.env.NEXT_PUBLIC_STRIPE_HOSTED_URL ??
  "https://buy.stripe.com/9B64gzdCD27wbiVf1kgrS0I";

export const PRICING = [
  {
    name: "Self-host License",
    price: "€149",
    cadence: "one-time",
    sub: "Includes 1 year of updates",
    features: ["Full source code", "Deploy-to-Vercel button", "Bring-your-own Neon", "All features unlocked", "Community support"],
    cta: "Buy license",
    href: STRIPE_SELFHOST_URL,
    featured: true,
  },
  {
    name: "License + Updates",
    price: "€59",
    cadence: "/yr",
    sub: "After year one",
    features: ["Ongoing updates", "New integrations", "Priority issue handling"],
    cta: "Add renewal",
    href: STRIPE_RENEW_URL,
    featured: false,
  },
  {
    name: "Hosted",
    price: "€12",
    cadence: "/mo · €120/yr",
    sub: "We run it for you",
    features: ["We run it for you", "One-click, zero setup", "Managed backups"],
    cta: "Get hosted",
    href: STRIPE_HOSTED_URL,
    comingSoon: false,
    featured: false,
  },
];

/**
 * Deploy-to-Vercel URL. Points at the PUBLIC deploy-template repo (kept in sync
 * via scripts/sync-public.sh); env vars are declared so Vercel prompts for them,
 * and the Neon storage integration auto-provisions DATABASE_URL. Override with
 * NEXT_PUBLIC_REPO_URL if you fork the template.
 */
export const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/costibotez/nomadwealth";

export const DEPLOY_URL =
  `https://vercel.com/new/clone?repository-url=${encodeURIComponent(REPO_URL)}` +
  `&project-name=nomadwealth&repository-name=nomadwealth` +
  `&env=SESSION_SECRET,DASHBOARD_PASSWORD` +
  `&envDescription=${encodeURIComponent("SESSION_SECRET signs your login cookie; DASHBOARD_PASSWORD is an optional fallback password.")}` +
  `&envLink=${encodeURIComponent(REPO_URL + "#environment-variables")}` +
  `&stores=${encodeURIComponent(JSON.stringify([{ type: "integration", integrationSlug: "neon", productSlug: "neon" }]))}`;

/**
 * Feedback & Support hub (see /feedback). The form posts to a hosted form
 * endpoint (the admin app's /api/feedback). All three intents — support,
 * feature and feedback — submit a message. Buyer self-host installs leave it
 * unset: the form falls back to a mailto link so nothing is lost.
 */
export const FEEDBACK_ENDPOINT = process.env.NEXT_PUBLIC_FEEDBACK_ENDPOINT ?? "";

/**
 * Pre-launch "Get early access" waitlist endpoint. VENDOR MARKETING ONLY —
 * set on the vendor's own deployment (nomadwealth.app) to a hosted form
 * service (Formspree/Tally) or the separate admin app's waitlist endpoint. The
 * browser POSTs only `{ email }` directly to it — no vendor backend, no
 * financial data, and the waitlist never lands in this product's Neon DB.
 *
 * Buyers self-hosting leave this UNSET: the early-access form then falls back
 * to a mailto: link so nothing breaks and no vendor endpoint is contacted.
 */
export const WAITLIST_ENDPOINT = process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT ?? "";
