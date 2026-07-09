CREATE TYPE "public"."property_status" AS ENUM('active', 'sold');--> statement-breakpoint
CREATE TABLE "property_rent" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"amount" numeric(20, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "status" "property_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "purchase_date" date;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "purchase_price" numeric(20, 6);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "sale_date" date;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "sale_price" numeric(20, 6);--> statement-breakpoint
ALTER TABLE "property_rent" ADD CONSTRAINT "property_rent_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;