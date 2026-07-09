CREATE TYPE "public"."business_status" AS ENUM('active', 'sold', 'closed');--> statement-breakpoint
CREATE TYPE "public"."business_ledger_kind" AS ENUM('revenue', 'cogs', 'ad_spend', 'expense');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('active', 'paused', 'churned');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('monthly_retainer', 'one_off', 'annual_hosting', 'marketing', 'reporting', 'hourly', 'other');--> statement-breakpoint
CREATE TYPE "public"."service_cadence" AS ENUM('monthly', 'quarterly', 'annual', 'one_off', 'times_per_year');--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" "business_status" DEFAULT 'active' NOT NULL,
	"valuation" numeric(20, 6),
	"started_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "business_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"kind" "business_ledger_kind" DEFAULT 'revenue' NOT NULL,
	"amount" numeric(20, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"label" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" "client_status" DEFAULT 'active' NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "client_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"type" "service_type" DEFAULT 'monthly_retainer' NOT NULL,
	"label" text,
	"amount" numeric(20, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"cadence" "service_cadence" DEFAULT 'monthly' NOT NULL,
	"times_per_year" integer,
	"hours" numeric(12, 2),
	"rate" numeric(20, 6),
	"start_date" date,
	"renewal_date" date,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "net_worth_snapshots" ADD COLUMN "businesses_eur" numeric(20, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_ledger" ADD CONSTRAINT "business_ledger_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_services" ADD CONSTRAINT "client_services_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
