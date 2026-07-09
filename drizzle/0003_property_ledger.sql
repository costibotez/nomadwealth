CREATE TYPE "public"."property_ledger_kind" AS ENUM('acquisition', 'sale');--> statement-breakpoint
CREATE TABLE "property_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"kind" "property_ledger_kind" NOT NULL,
	"label" text NOT NULL,
	"amount" numeric(20, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"occurred_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "property_ledger" ADD CONSTRAINT "property_ledger_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;