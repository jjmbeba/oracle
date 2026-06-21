CREATE TABLE "provider_payload" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"category" text NOT NULL,
	CONSTRAINT "provider_payload_category_check"
		CHECK ("category" IN ('earthquake', 'weather', 'space-weather')),
	"source_url" text NOT NULL,
	"content_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"job_name" text NOT NULL,
	"http_status" integer NOT NULL
);

CREATE UNIQUE INDEX "provider_payload_dedup_idx"
	ON "provider_payload" ("provider", "source_url", "content_hash");

CREATE INDEX "provider_payload_fetched_at_idx"
	ON "provider_payload" ("fetched_at");
