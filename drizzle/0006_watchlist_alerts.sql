CREATE TYPE "public"."alert_direction" AS ENUM('above', 'below');--> statement-breakpoint
CREATE TABLE "price_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"asset_class" "asset_class" NOT NULL,
	"target_price" numeric(20, 6) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"direction" "alert_direction" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"triggered_at" timestamp with time zone,
	"triggered_price" numeric(20, 6),
	"acknowledged_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"asset_class" "asset_class" NOT NULL,
	"label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
