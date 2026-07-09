CREATE TABLE "income_legend" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"custom_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wedding_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"paid" numeric(20, 6) DEFAULT '0' NOT NULL,
	"remaining" numeric(20, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'RON' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
