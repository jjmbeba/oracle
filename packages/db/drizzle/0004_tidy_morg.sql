CREATE TABLE "provider_freshness" (
	"provider" text NOT NULL,
	"category" text NOT NULL,
	"last_successful_poll_at" timestamp with time zone NOT NULL,
	CONSTRAINT "provider_freshness_category_check"
		CHECK ("category" IN ('earthquake', 'weather', 'space-weather')),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_freshness_provider_category_pk" PRIMARY KEY("provider","category")
);
