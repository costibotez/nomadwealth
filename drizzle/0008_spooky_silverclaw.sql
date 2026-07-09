CREATE TABLE "dividends" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"asset_class" "asset_class" DEFAULT 'ro_stock' NOT NULL,
	"ex_date" date,
	"pay_date" date NOT NULL,
	"amount_per_share" numeric(20, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'RON' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
