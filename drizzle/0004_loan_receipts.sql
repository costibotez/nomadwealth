CREATE TYPE "public"."receipt_kind" AS ENUM('principal', 'interest');--> statement-breakpoint
CREATE TYPE "public"."receipt_method" AS ENUM('cash', 'bank_transfer');--> statement-breakpoint
CREATE TABLE "loan_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"kind" "receipt_kind" DEFAULT 'principal' NOT NULL,
	"amount" numeric(20, 6) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"received_on" date NOT NULL,
	"method" "receipt_method" DEFAULT 'bank_transfer' NOT NULL,
	"bank" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "loan_receipts" ADD CONSTRAINT "loan_receipts_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;