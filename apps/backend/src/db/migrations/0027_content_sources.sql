CREATE TABLE "content_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"adapter_type" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"formats" jsonb NOT NULL,
	"style" jsonb NOT NULL,
	"sync_interval_minutes" integer DEFAULT 360 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"next_sync_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"last_sync_status" text,
	"last_sync_error" text,
	"last_sync_summary" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_event_slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_event_id" uuid NOT NULL,
	"format" text NOT NULL,
	"content_id" uuid NOT NULL,
	"render_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"event_date" text NOT NULL,
	"start_time" text,
	"starts_at" timestamp with time zone NOT NULL,
	"venue" text NOT NULL,
	"city" text,
	"genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status_labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cancelled" boolean DEFAULT false NOT NULL,
	"sold_out" boolean DEFAULT false NOT NULL,
	"notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detail_url" text,
	"image_url" text,
	"ticket_url" text,
	"price_cents" integer,
	"currency" text,
	"data_hash" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"gone_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "managed_by_source_id" uuid;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "kind" text DEFAULT 'static' NOT NULL;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "rule" jsonb;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "next_resolve_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "last_resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "content_sources" ADD CONSTRAINT "content_sources_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_event_slides" ADD CONSTRAINT "source_event_slides_source_event_id_source_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."source_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_event_slides" ADD CONSTRAINT "source_event_slides_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_events" ADD CONSTRAINT "source_events_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_events" ADD CONSTRAINT "source_events_source_id_content_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."content_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_content_sources_organisation" ON "content_sources" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "IDX_content_sources_next_sync" ON "content_sources" USING btree ("next_sync_at");--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_source_event_slides_event_format" ON "source_event_slides" USING btree ("source_event_id","format");--> statement-breakpoint
CREATE INDEX "IDX_source_event_slides_content" ON "source_event_slides" USING btree ("content_id");--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_source_events_source_external" ON "source_events" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "IDX_source_events_org_date" ON "source_events" USING btree ("organisation_id","event_date");--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_managed_by_source_id_content_sources_id_fk" FOREIGN KEY ("managed_by_source_id") REFERENCES "public"."content_sources"("id") ON DELETE cascade ON UPDATE no action;