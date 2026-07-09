CREATE TYPE "public"."account_type" AS ENUM('crypto', 'personal_cash', 'company_cash', 'savings', 'brokerage');--> statement-breakpoint
CREATE TYPE "public"."asset_class" AS ENUM('ro_stock', 'us_stock', 'crypto', 'reit', 'mutual_fund', 'gold', 'other');--> statement-breakpoint
CREATE TYPE "public"."cashflow_kind" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."compounding" AS ENUM('simple', 'monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."direction" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."loan_backed" AS ENUM('property', 'business', 'personal', 'none');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('active', 'repaid', 'defaulted');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"balance" numeric(20, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"is_company" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cashflow_expense" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" integer NOT NULL,
	"year" integer DEFAULT 2026 NOT NULL,
	"label" text NOT NULL,
	"amount" numeric(20, 6) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"amount_eur" numeric(20, 6) NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cashflow_income" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" integer NOT NULL,
	"year" integer DEFAULT 2026 NOT NULL,
	"label" text NOT NULL,
	"amount" numeric(20, 6) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"amount_eur" numeric(20, 6) NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"base" text NOT NULL,
	"quote" text NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"due_date" date NOT NULL,
	"amount" numeric(20, 6) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"borrower" text NOT NULL,
	"principal" numeric(20, 6) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"backed" "loan_backed" DEFAULT 'none' NOT NULL,
	"start_date" date,
	"interest_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"compounding" "compounding" DEFAULT 'simple' NOT NULL,
	"term_months" integer,
	"status" "loan_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"value" numeric(20, 6) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"monthly_rent" numeric(20, 6) DEFAULT '0' NOT NULL,
	"is_rented" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "property_income" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"year" integer NOT NULL,
	"income" numeric(20, 6) DEFAULT '0' NOT NULL,
	"roi" numeric(10, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "realized_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_class" "asset_class" NOT NULL,
	"symbol" text NOT NULL,
	"open_date" date,
	"close_date" date,
	"quantity" numeric(30, 12) DEFAULT '0' NOT NULL,
	"cost" numeric(20, 6) DEFAULT '0' NOT NULL,
	"proceeds" numeric(20, 6) DEFAULT '0' NOT NULL,
	"pl" numeric(20, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trade_date" date NOT NULL,
	"direction" "direction" DEFAULT 'buy' NOT NULL,
	"asset_class" "asset_class" NOT NULL,
	"symbol" text NOT NULL,
	"quantity" numeric(30, 12) NOT NULL,
	"unit_cost" numeric(20, 6) DEFAULT '0' NOT NULL,
	"cost_currency" text DEFAULT 'USD' NOT NULL,
	"current_price" numeric(20, 6) DEFAULT '0' NOT NULL,
	"price_currency" text DEFAULT 'USD' NOT NULL,
	"maturity_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_income" ADD CONSTRAINT "property_income_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;