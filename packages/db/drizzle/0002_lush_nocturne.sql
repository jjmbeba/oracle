CREATE TABLE "watched_region" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"region_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "watched_region" ADD CONSTRAINT "watched_region_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "watched_region_user_region_unique" ON "watched_region" USING btree ("user_id","region_id");--> statement-breakpoint
CREATE INDEX "watched_region_user_id_idx" ON "watched_region" USING btree ("user_id");