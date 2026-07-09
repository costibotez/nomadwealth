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

### Hardening notes / future
- A clearly-commented **seam** in `src/lib/auth.ts` and `middleware.ts` shows
  where to swap in NextAuth (email magic link) for multi-device auth.
- Consider a long, randomly generated `DASHBOARD_PASSWORD` and rotating
  `SESSION_SECRET` if you ever suspect exposure (rotating it logs you out).

## Required environment variables

| Var                 | Where            | Notes                                   |
| ------------------- | ---------------- | --------------------------------------- |
| `DATABASE_URL`      | Neon → Vercel    | Pooled connection string                |
| `DASHBOARD_PASSWORD`| Vercel           | The unlock password (timing-safe compare)|
| `SESSION_SECRET`    | Vercel           | `openssl rand -base64 48`               |

FX provider (Frankfurter) is keyless — no secret required.

## Backups
- Enable **Neon point-in-time restore** and/or keep a `main` branch as a backstop.
- `pnpm db:backup` writes a gitignored `pg_dump` to `./backups/` before bulk edits.
- Deletes in the UI are **soft** (`deleted_at`) and recoverable from `/trash`,
  so an accidental delete is never immediately destructive.
