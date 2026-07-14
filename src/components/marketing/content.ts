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
 * "Your entire net worth — down to" and these complete it, cycling through the
 * assets a plain brokerage app can't hold. Phrased as positive, complete noun
 * phrases so any frame — mid-type or paused — reads as a true, benefit-first
 * statement (never a negative "not just …" partial).
 */
export const TYPED_WORDS = [
  "your rental abroad.",
  "the last private loan.",
  "the cash in your business.",
  "every last currency.",
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

/** Customer testimonials — social proof shown before pricing. */
export const TESTIMONIALS = [
  {
    headline: "I finally have one clear view of everything.",
    body: "I had investments in 2 brokerages, property abroad and income in different currencies. NomadWealth brings everything together in one clear number without forcing me into another cloud finance app.",
    name: "Anthony P.",
    role: "Remote business owner",
  },
  {
    headline: "It replaced the spreadsheet I was constantly fixing.",
    body: "I used to track stocks, cash, real estate and private loans across multiple tabs. The app gave me the complete picture while letting me stay in control of my data.",
    name: "Rachel D.",
    role: "DIY investor",
  },
  {
    headline: "The privacy-first approach convinced me.",
    body: "I avoided most net-worth apps because I did not want to share my financial history. Running NomadWealth on my own infrastructure gives me the dashboard I wanted without giving up control.",
    name: "Andrei A.",
    role: "Privacy-focused investor",
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
    body: "Bring your own keys — optional price-data for quotes, Resend for email alerts. Browser push is keyless. Nothing routes through our servers.",
  },
];

export const FEATURES = [
  { tag: "MULTI-CURRENCY", title: "EUR · USD · GBP · RON", body: "Hold assets in any currency; see net worth in the one you think in. Live FX applied everywhere." },
  { tag: "MULTI-ASSET", title: "Beyond just stocks", body: "Public holdings, real estate, private loans receivable, cash and business income in one model." },
  { tag: "FIRE", title: "Projection you can steer", body: "Forward net-worth model with editable savings, return and target — and read-only share links." },
  { tag: "ONBOARDING", title: "CSV & Excel import", body: "Map columns from any bank or broker export, or add assets by hand. Guided empty states throughout." },
  { tag: "ALERTS", title: "Price alerts that reach you", body: "Track tickers and get price alerts by browser push or email — checked on the server, so they fire even when the app is closed." },
  { tag: "SETUP", title: "Live in minutes", body: "A first-run wizard handles migrations, Neon connect and license activation — no config files, no command line." },
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
  { label: "Price alerts (push + email)", us: "✓", cloud: "~", ghost: "~" },
  { label: "Set your own prices", us: "✓", cloud: "✕", ghost: "✓" },
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

/**
 * Two honest choices, no third box: own the software outright, or let us host
 * it. The old third "renewal" tier was folded into a footnote on the Own card
 * (see OWN_RENEWAL) — renewal is optional and never gates the running app.
 * `PRICING` stays an array so StructuredData can still emit an Offer per tier.
 */
export const OWN = {
  name: "Own it",
  badge: "PAY ONCE",
  price: "€149",
  cadence: "one-time · yours forever",
  sub: "Full source · 1 year of updates included",
  features: [
    "Full source code — read every line",
    "One-click deploy to your own Vercel",
    "Bring your own Neon Postgres",
    "Every feature unlocked — no tiers",
    "1 year of updates included",
  ],
  cta: "Buy license — €149",
  href: STRIPE_SELFHOST_URL,
  featured: true,
} as const;

export const HOSTED = {
  name: "We host it",
  price: "€15",
  cadence: "/mo · €150/yr",
  sub: "We run it — zero setup · two months free on annual",
  features: [
    "We run it — zero infrastructure setup",
    "Managed backups & updates",
    "Every feature, same product",
    "Export & self-host any time",
  ],
  note: "For people who want the product but not the infra. Same privacy posture — your data stays encrypted and yours.",
  cta: "Get hosted",
  footer: "Cancel anytime · export & self-host whenever you want",
  href: STRIPE_HOSTED_URL,
  featured: false,
} as const;

export const PRICING = [OWN, HOSTED];

/**
 * 4-year cost-of-ownership reframe shown inside the Own card. One consistent
 * horizon (4 yrs) across the figure and the copy. The cloud comparison is a
 * sourced, defensible claim — not a bare number.
 */
export const OWN_TCO = {
  headline: "4-year cost of ownership",
  keep: "You keep €247+",
  rows: [
    { label: "NomadWealth", value: "€149 flat", pct: 38 },
    { label: "Cloud tracker · ~€99/yr", value: "€396 & climbing", pct: 100 },
  ],
  note: "Subscriptions bill every year and hold your data. Ownership is a one-time line — the gap only widens.",
  source: "~€99/yr based on Monarch (~$99/yr); Kubera ~$199/yr; Empower free. Illustrative, in EUR.",
} as const;

export const OWN_GUARANTEE = {
  title: "30-day money-back guarantee.",
  body: "You set it up before you see the value — if it's not for you, one email gets a full refund. No forms.",
} as const;

/**
 * Renewal reframed as optional upside, never a tax (see /license). Split into
 * segments so the lead and the "never disables itself" clause render bold —
 * matching the emphasis pattern on the pricing card.
 */
export const OWN_RENEWAL = {
  lead: "After year one: keep the updates coming — €39/yr.",
  body: " New features, integrations, and asset types ship continuously; renewing keeps you on the latest. It's optional and there's no lock-in — the app ",
  emphasis: "never disables itself",
  tail: ", and everything you already have keeps working forever. Renew only when a new version is worth it to you.",
} as const;

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
  `&env=SESSION_SECRET,DASHBOARD_PASSWORD,SETUP_TOKEN` +
  `&envDescription=${encodeURIComponent("SESSION_SECRET signs your login cookie; DASHBOARD_PASSWORD is an optional fallback password; SETUP_TOKEN protects the first-run wizard until you finish it.")}` +
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
