/**
 * Generates src/db/migrations.generated.ts from the drizzle/*.sql files.
 *
 * Why: the setup wizard applies migrations at RUNTIME over the Neon serverless
 * driver (drizzle-kit is a dev-time native binary that does not run in
 * serverless/restricted envs — see the build brief). Embedding the SQL in a TS
 * module guarantees it is bundled into the deployment (no filesystem reliance)
 * and executed in journal order, tracked in a __nw_migrations table.
 *
 * Run:  pnpm tsx scripts/gen-migrations.ts   (after any `pnpm db:generate`)
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DRIZZLE = path.join(ROOT, "drizzle");
const OUT = path.join(ROOT, "src", "db", "migrations.generated.ts");

interface JournalEntry {
  tag: string;
}
const journal = JSON.parse(
  fs.readFileSync(path.join(DRIZZLE, "meta", "_journal.json"), "utf8"),
) as { entries: JournalEntry[] };

// The 4 self-host packaging tables. Kept idempotent (IF NOT EXISTS) so the
// runtime migrator is safe to re-run against a partially-set-up DB.
const PACKAGING_SQL = `CREATE TABLE IF NOT EXISTS "app_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"setup_completed_at" timestamp with time zone,
	"schema_version" text NOT NULL,
	"display_currency" text DEFAULT 'EUR' NOT NULL,
	"share_activation" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "owner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"key" text NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tier" text DEFAULT 'self-host' NOT NULL,
	"updates_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_class" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"row_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);`;

const migrations: { tag: string; sql: string }[] = journal.entries.map((e) => ({
  tag: e.tag,
  sql: fs.readFileSync(path.join(DRIZZLE, `${e.tag}.sql`), "utf8"),
}));
migrations.push({ tag: "9999_packaging_tables", sql: PACKAGING_SQL });
// Idempotent follow-ups for already-provisioned installs (columns added after
// the initial packaging tables shipped).
migrations.push({
  tag: "9999b_share_activation",
  sql: `ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "share_activation" boolean DEFAULT false NOT NULL;`,
});
// Optional TOTP two-factor auth for the owner account. Idempotent so already
// provisioned installs pick the columns up on the next boot/migrate run.
migrations.push({
  tag: "9999c_owner_2fa",
  sql: `ALTER TABLE "owner" ADD COLUMN IF NOT EXISTS "totp_secret" text;
--> statement-breakpoint
ALTER TABLE "owner" ADD COLUMN IF NOT EXISTS "totp_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "owner" ADD COLUMN IF NOT EXISTS "backup_codes" jsonb;`,
});
// Price-alert notifications: delivery channels, Web Push subscriptions + VAPID
// keys, and a once-only dispatch guard on price_alerts. Idempotent.
migrations.push({
  tag: "9999d_notifications",
  sql: `CREATE TABLE IF NOT EXISTS "notification_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_channels_type_key" ON "notification_channels" ("type");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key" ON "push_subscriptions" ("endpoint");
--> statement-breakpoint
ALTER TABLE "price_alerts" ADD COLUMN IF NOT EXISTS "notified_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "vapid_public_key" text;
--> statement-breakpoint
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "vapid_private_key" text;`,
});

// Login brute-force protection (see lib/rate-limit.ts). Idempotent.
migrations.push({
  tag: "9999e_login_attempts",
  sql: `CREATE TABLE IF NOT EXISTS "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"last_failure_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "login_attempts_key_key" ON "login_attempts" ("key");`,
});

// Session revocation generation on the owner row (see lib/auth.ts). Idempotent.
migrations.push({
  tag: "9999f_owner_session_version",
  sql: `ALTER TABLE "owner" ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 1 NOT NULL;`,
});

// Bookkeeping for the user-facing "Load sample data" onboarding action, so it
// can be removed again with one click (see lib/sample-data.ts). Idempotent.
migrations.push({
  tag: "9999g_sample_rows",
  sql: `CREATE TABLE IF NOT EXISTS "sample_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"row_id" integer NOT NULL
);`,
});

// Net-worth milestone bookkeeping for the celebration notifications
// (see lib/notifications/milestones.ts). Idempotent.
migrations.push({
  tag: "9999h_milestones",
  sql: `ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "last_milestone_eur" numeric(20, 6);`,
});

// schemaVersion = the last tag, so app_config records exactly what was applied.
const schemaVersion = migrations[migrations.length - 1].tag;

const banner = `/**
 * AUTO-GENERATED by scripts/gen-migrations.ts — DO NOT EDIT BY HAND.
 *
 * Ordered SQL migrations embedded for RUNTIME application by the setup wizard
 * (see lib/migrate-runtime.ts). Regenerate with: pnpm gen:migrations
 */
/* eslint-disable */
export const SCHEMA_VERSION = ${JSON.stringify(schemaVersion)};

export interface EmbeddedMigration {
  tag: string;
  /** Individual statements, already split on drizzle's statement-breakpoint. */
  statements: string[];
}

export const MIGRATIONS: EmbeddedMigration[] = ${JSON.stringify(
  migrations.map((m) => ({
    tag: m.tag,
    statements: m.sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  })),
  null,
  2,
)};
`;

fs.writeFileSync(OUT, banner);
console.log(
  `Wrote ${OUT}\n  ${migrations.length} migrations, schemaVersion=${schemaVersion}`,
);
