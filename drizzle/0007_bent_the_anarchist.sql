CREATE TABLE "net_worth_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_date" date NOT NULL,
	"total_eur" numeric(20, 6) NOT NULL,
	"personal_eur" numeric(20, 6) NOT NULL,
	"investments_eur" numeric(20, 6) DEFAULT '0' NOT NULL,
	"accounts_eur" numeric(20, 6) DEFAULT '0' NOT NULL,
	"loans_eur" numeric(20, 6) DEFAULT '0' NOT NULL,
	"properties_eur" numeric(20, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "net_worth_snapshots_snapshot_date_unique" UNIQUE("snapshot_date")
);
