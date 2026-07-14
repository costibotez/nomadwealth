# Security

This app contains real net-worth data. The rules below are non-negotiable.

## Hard requirements

1. **The GitHub repo MUST be private.** If you cannot confirm it is private, stop and fix that first.
2. **Real data lives in Neon, never in git.** The `.gitignore` excludes:
   - the raw spreadsheets (`*.xlsx`, `*.xls`, `/data/`),
   - any DB dumps / backups (`*.dump`, `/backups/`, `db-backup-*.sql`),
   - all env files (`.env`, `.env*.local`).
   The `.xlsx` files are used **once locally** by `pnpm import` and are never deployed.
3. **No secrets in the repo.** Everything sensitive is an environment variable
   (Vercel project settings locally `.env.local`). See `.env.example`.

## How the gate works

- A single password unlocks the dashboard. `/login` POSTs to `/api/auth/login`,
  which compares the input to `DASHBOARD_PASSWORD` using a **timing-safe** compare.
- On success it sets a signed, **httpOnly** session cookie (`pid_session`):
  `Secure` in production, `SameSite=Lax`, 7-day expiry. The cookie is an
  HMAC-SHA256 token signed with `SESSION_SECRET` (Web Crypto, runs on Edge + Node).
- `middleware.ts` protects **every** route except `/login`, `/api/auth/login`,
  and static assets. It fails closed if `SESSION_SECRET` is missing.
- All mutations are Server Actions / route handlers; the client never touches the DB.

### Hardening in place
- **Login brute-force protection**: failed passwords/2FA codes are throttled
  per-IP (and globally) with exponential lockout, tracked in the buyer's own
  Postgres (`login_attempts`) — no external rate-limit service.
- **Session revocation**: tokens carry a generation (`ver`) matched against
  `owner.session_version`. Changing the password, toggling 2FA, or Settings →
  "Log out all devices" invalidates every outstanding token; edge middleware
  checks signature + expiry, the Node layer enforces revocation.
- **Independent route auth**: routes that return portfolio data call
  `requireSession()` themselves — middleware is a redirect convenience, not
  the security boundary.
- **HTTP security headers** (`next.config.ts`): CSP (no external script
  origins), HSTS, `frame-ancestors 'none'` / `X-Frame-Options: DENY`,
  `nosniff`, strict referrer policy, minimal permissions policy.
- **Cross-origin API rejection** in middleware (Origin/Host check) as CSRF
  defense-in-depth on top of `SameSite=Lax`.
- **First-run takeover protection**: set `SETUP_TOKEN` at deploy time and the
  setup wizard/APIs require it until setup completes.
- **Cron endpoints** accept only the `Authorization: Bearer $CRON_SECRET`
  header and fail closed when unset.

### Hardening notes / future
- A clearly-commented **seam** in `src/lib/auth.ts` and `middleware.ts` shows
  where to swap in NextAuth (email magic link) for multi-device auth.
- Consider a long, randomly generated `DASHBOARD_PASSWORD` and rotating
  `SESSION_SECRET` if you ever suspect exposure (rotating it logs you out).
- `xlsx` (SheetJS) is a devDependency used only by the local import script —
  never bundled into the deployment. npm's 0.18.5 has open advisories with no
  registry fix; only run `pnpm import` on spreadsheets you trust, and run
  `pnpm audit` periodically.

## Required environment variables

| Var                 | Where            | Notes                                   |
| ------------------- | ---------------- | --------------------------------------- |
| `DATABASE_URL`      | Neon → Vercel    | Pooled connection string                |
| `DASHBOARD_PASSWORD`| Vercel           | Optional fallback (owner row wins)      |
| `SESSION_SECRET`    | Vercel           | `openssl rand -base64 48`               |
| `SETUP_TOKEN`       | Vercel (optional)| Guards the first-run wizard; removable after setup |

FX provider (Frankfurter) is keyless — no secret required.

## Backups
- Enable **Neon point-in-time restore** and/or keep a `main` branch as a backstop.
- `pnpm db:backup` writes a gitignored `pg_dump` to `./backups/` before bulk edits.
- Deletes in the UI are **soft** (`deleted_at`) and recoverable from `/trash`,
  so an accidental delete is never immediately destructive.
