CREATE TABLE "watched_region_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"watched_region_id" text NOT NULL REFERENCES "watched_region"("id") ON DELETE CASCADE,
	"taken_at" timestamp with time zone NOT NULL,
	"risk_score" integer NOT NULL,
	"risk_level" text NOT NULL,
	CONSTRAINT "watched_region_snapshot_risk_level_check"
		CHECK ("risk_level" IN ('quiet', 'watch', 'elevated', 'high', 'critical')),
	"worst_severity" text,
	CONSTRAINT "watched_region_snapshot_worst_severity_check"
		CHECK ("worst_severity" IS NULL OR "worst_severity" IN ('minor', 'moderate', 'significant', 'severe', 'extreme')),
	"contributing_signals" integer NOT NULL,
	"signals" jsonb NOT NULL
);

CREATE INDEX "wrs_region_taken_idx" ON "watched_region_snapshot" ("watched_region_id", "taken_at");
