ALTER TABLE "live_streams" ALTER COLUMN "source_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "live_streams" ADD COLUMN "source_type" text DEFAULT 'pull' NOT NULL;--> statement-breakpoint
ALTER TABLE "live_streams" ADD COLUMN "agent_id" uuid;--> statement-breakpoint
ALTER TABLE "live_streams" ADD COLUMN "camera_host" text;--> statement-breakpoint
ALTER TABLE "live_streams" ADD COLUMN "ndi_source_name" text;--> statement-breakpoint
ALTER TABLE "live_streams" ADD COLUMN "quality_preset" text DEFAULT '720p30' NOT NULL;--> statement-breakpoint
ALTER TABLE "live_streams" ADD COLUMN "encoder_pref" text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_agent_id_site_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."site_agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_live_streams_agent" ON "live_streams" USING btree ("agent_id");