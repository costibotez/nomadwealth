CREATE TABLE "wedding_gifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'Nuntă' NOT NULL,
	"amount" numeric(20, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'RON' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
