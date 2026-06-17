CREATE TABLE "signal" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"provider_event_id" text,
	"possible_cross_provider_duplicate_key" text,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"severity" text NOT NULL,
	"confidence" text NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"occurred_at" timestamp with time zone,
	"issued_at" timestamp with time zone,
	"scope_kind" text NOT NULL,
	"region_id" text,
	"longitude" double precision,
	"latitude" double precision,
	"geometry" jsonb,
	"source_link_url" text,
	"source_link_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "signal_dedupe_key_unique" ON "signal" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "signal_category_idx" ON "signal" USING btree ("category");--> statement-breakpoint
CREATE INDEX "signal_effective_at_idx" ON "signal" USING btree ("effective_at");--> statement-breakpoint
CREATE INDEX "signal_scope_region_idx" ON "signal" USING btree ("scope_kind","region_id");