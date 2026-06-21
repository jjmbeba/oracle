CREATE TABLE "change_report" (
	"id" text PRIMARY KEY NOT NULL,
	"watched_region_id" text NOT NULL REFERENCES "watched_region"("id") ON DELETE CASCADE,
	"generated_at" timestamp with time zone NOT NULL,
	"new_signals" jsonb NOT NULL,
	"expired_signals" jsonb NOT NULL,
	"severity_changes" jsonb NOT NULL,
	"risk_movement" jsonb NOT NULL
);

CREATE INDEX "cr_watched_region_generated_idx"
	ON "change_report" ("watched_region_id", "generated_at");
