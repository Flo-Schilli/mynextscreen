ALTER TABLE "event_schedule_rules" ADD COLUMN "genre_variants" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "managed_by_rule_id" uuid;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "variant_key" text;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_managed_by_rule_id_event_schedule_rules_id_fk" FOREIGN KEY ("managed_by_rule_id") REFERENCES "public"."event_schedule_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_playlists_managed_variant" ON "playlists" USING btree ("managed_by_rule_id","variant_key") WHERE "playlists"."managed_by_rule_id" IS NOT NULL;