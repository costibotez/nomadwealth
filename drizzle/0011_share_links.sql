CREATE TABLE "share_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"allowed_tabs" text[] DEFAULT '{}' NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "share_links_token_hash_unique" UNIQUE("token_hash")
);
