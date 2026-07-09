<div align="center">

# NomadWealth

**Your entire net worth — not just your stocks.**

A self-hostable personal net-worth & investment cockpit. Track public holdings,
real estate, private loans, business income, cash and crypto — in every currency,
with a FIRE projection — on **your own** Vercel and **your own** Neon Postgres.

We literally can't see your data. It never leaves your infrastructure.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcostibotez%2Fnomadwealth&project-name=nomadwealth&repository-name=nomadwealth&env=SESSION_SECRET%2CDASHBOARD_PASSWORD&envDescription=SESSION_SECRET%20signs%20your%20login%20cookie%3B%20DASHBOARD_PASSWORD%20is%20an%20optional%20fallback.&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%7D%5D)

[Live demo](https://www.nomadwealth.app/demo) · [Website](https://www.nomadwealth.app) · [Security & privacy](https://www.nomadwealth.app/security)

</div>

---

## Why NomadWealth

Most trackers show you one slice — a brokerage, a single currency, this year.
NomadWealth gives you **one honest number across everything you own**, in the
currency you actually think in, on infrastructure only you control.

- 🏦 **Multi-asset** — public holdings, real estate, private loans receivable, business income, cash & crypto in one model.
- 🌍 **Multi-currency** — hold assets in EUR · USD · GBP · RON; see net worth in the one you think in. Live FX everywhere.
- 🔥 **FIRE projection** — a forward net-worth model with editable savings, return and target — and read-only share links.
- 📈 **Real analytics** — performance, dividends, realized/unrealized P/L, concentration flags, watchlist & price alerts.
- 📥 **Easy onboarding** — a first-run wizard, plus CSV/Excel import from any bank or broker export (parsed in your browser).
- 🔒 **Private by design** — self-hosted; your figures live in your Neon, reached only by code in your Vercel account.

## The privacy invariant

**No vendor data access — by architecture, not by promise.**

- Your data lives in **your** Neon, reached only by code running in **your** Vercel account.
- No analytics that capture financial values. No error reporting with data payloads.
- License activation is **offline** (Ed25519, embedded public key) — no phone-home.
- The app runs with only `DATABASE_URL` + `SESSION_SECRET`. Everything else is optional and yours.

See [`SECURITY.md`](./SECURITY.md) and the public [security page](https://www.nomadwealth.app/security).

## One-click deploy

1. Click **Deploy with Vercel** above.
2. Vercel clones this repo into **your** account and provisions **your** Neon Postgres (via the Neon integration).
3. Add the two required env vars when prompted: `SESSION_SECRET` (a long random string) and, optionally, `DASHBOARD_PASSWORD`.
4. Open your new deployment — the **first-run setup wizard** takes over:
   - **1 · Neon** — confirm the connection; the schema migrates automatically into your DB.
   - **2 · License** — paste the license key emailed after purchase (verified offline) and set your owner password.
   - **3 · Import** — upload a CSV/Excel export or start entering assets by hand.

That's it — your cockpit is live, on your own infrastructure.

## Local development

```bash
pnpm install
cp .env.example .env.local        # fill in DATABASE_URL + SESSION_SECRET
pnpm dev                          # http://localhost:3000
```

Other scripts: `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Environment variables

Only two are required to run:

| Variable | Required | What it's for |
| --- | :---: | --- |
| `DATABASE_URL` | ✅ | Your Neon Postgres connection string (auto-provisioned by the Vercel + Neon integration). |
| `SESSION_SECRET` | ✅ | Signs your login session cookie. Generate with `openssl rand -base64 48`. |
| `DASHBOARD_PASSWORD` | — | Optional fallback password (the owner password set in the wizard takes precedence). |
| `CMC_API_KEY` | — | Your own CoinMarketCap key for live crypto prices (stocks use keyless Yahoo Finance). |

Everything else in [`.env.example`](./.env.example) is optional and documented inline.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · Drizzle ORM · Neon serverless
Postgres · deployed on Vercel. Runtime migrations (no drizzle-kit at deploy time).
Node 24.

## License

Self-host license — see your purchase for terms. You get the full source and run
it on your own infrastructure; the license gates use and updates, never your data.

<div align="center">
<sub>Built for people who want the whole picture, and want it private.</sub>
</div>
