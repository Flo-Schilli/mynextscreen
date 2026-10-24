CREATE TABLE "event_schedule_rule_exclusions" (
	"rule_id" uuid NOT NULL,
	"source_event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_schedule_rule_exclusions_rule_id_source_event_id_pk" PRIMARY KEY("rule_id","source_event_id")
);
--> statement-breakpoint
CREATE TABLE "event_schedule_rule_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"screen_id" uuid,
	"group_id" uuid,
	CONSTRAINT "CHK_event_schedule_rule_targets_one" CHECK (("event_schedule_rule_targets"."screen_id" IS NULL) <> ("event_schedule_rule_targets"."group_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "event_schedule_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"name" text NOT NULL,
	"venues" jsonb NOT NULL,
	"playlist_id" uuid NOT NULL,
	"window_start" text NOT NULL,
	"window_end" text NOT NULL,
	"exclude_cancelled" boolean DEFAULT true NOT NULL,
	"colour" text DEFAULT '#6d6cf6' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_reconciled_at" timestamp with time zone,
	"last_reconcile_summary" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD COLUMN "managed_by_rule_id" uuid;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD COLUMN "managed_source_event_id" uuid;--> statement-breakpoint
ALTER TABLE "event_schedule_rule_exclusions" ADD CONSTRAINT "event_schedule_rule_exclusions_rule_id_event_schedule_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."event_schedule_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_schedule_rule_exclusions" ADD CONSTRAINT "event_schedule_rule_exclusions_source_event_id_source_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."source_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_schedule_rule_targets" ADD CONSTRAINT "event_schedule_rule_targets_rule_id_event_schedule_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."event_schedule_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_schedule_rule_targets" ADD CONSTRAINT "event_schedule_rule_targets_screen_id_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_schedule_rule_targets" ADD CONSTRAINT "event_schedule_rule_targets_group_id_screen_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."screen_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_schedule_rules" ADD CONSTRAINT "event_schedule_rules_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_schedule_rules" ADD CONSTRAINT "event_schedule_rules_source_id_content_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."content_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_schedule_rules" ADD CONSTRAINT "event_schedule_rules_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_event_schedule_rule_targets_rule" ON "event_schedule_rule_targets" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "IDX_event_schedule_rules_source" ON "event_schedule_rules" USING btree ("source_id");--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_managed_by_rule_id_event_schedule_rules_id_fk" FOREIGN KEY ("managed_by_rule_id") REFERENCES "public"."event_schedule_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_managed_source_event_id_source_events_id_fk" FOREIGN KEY ("managed_source_event_id") REFERENCES "public"."source_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_schedule_entries_managed_screen" ON "schedule_entries" USING btree ("managed_by_rule_id","managed_source_event_id","screen_id") WHERE "schedule_entries"."managed_by_rule_id" IS NOT NULL AND "schedule_entries"."screen_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_schedule_entries_managed_group" ON "schedule_entries" USING btree ("managed_by_rule_id","managed_source_event_id","group_id") WHERE "schedule_entries"."managed_by_rule_id" IS NOT NULL AND "schedule_entries"."group_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "IDX_schedule_entries_screen" ON "schedule_entries" USING btree ("screen_id");--> statement-breakpoint
CREATE INDEX "IDX_schedule_entries_group" ON "schedule_entries" USING btree ("group_id");