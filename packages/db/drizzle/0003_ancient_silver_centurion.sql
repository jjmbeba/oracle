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
--> statement-breakpoint
ALTER TABLE "signal"
  ADD CONSTRAINT "signal_category_check"
    CHECK ("category" IN ('earthquake', 'weather', 'space-weather')),
  ADD CONSTRAINT "signal_severity_check"
    CHECK ("severity" IN ('minor', 'moderate', 'significant', 'severe', 'extreme')),
  ADD CONSTRAINT "signal_confidence_check"
    CHECK ("confidence" IN ('high', 'medium', 'low')),
  ADD CONSTRAINT "signal_scope_kind_check"
    CHECK ("scope_kind" IN ('global', 'region', 'point', 'geometry')),
  ADD CONSTRAINT "signal_scope_shape_check"
    CHECK (
      ("scope_kind" = 'global'    AND "region_id" IS NULL AND "longitude" IS NULL AND "latitude" IS NULL AND "geometry" IS NULL) OR
      ("scope_kind" = 'region'    AND "region_id" IS NOT NULL AND "longitude" IS NULL AND "latitude" IS NULL AND "geometry" IS NULL) OR
      ("scope_kind" = 'point'     AND "region_id" IS NULL AND "longitude" IS NOT NULL AND "latitude" IS NOT NULL AND "geometry" IS NULL) OR
      ("scope_kind" = 'geometry'  AND "region_id" IS NULL AND "longitude" IS NULL AND "latitude" IS NULL AND "geometry" IS NOT NULL)
    ),
  ADD CONSTRAINT "signal_longitude_range_check"
    CHECK ("longitude" IS NULL OR ("longitude" BETWEEN -180 AND 180)),
  ADD CONSTRAINT "signal_latitude_range_check"
    CHECK ("latitude" IS NULL OR ("latitude" BETWEEN -90 AND 90));