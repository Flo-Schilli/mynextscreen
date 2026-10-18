ALTER TABLE "live_streams" ADD COLUMN "ptz_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "live_streams" ADD COLUMN "ptz_protocol" text DEFAULT 'visca_udp' NOT NULL;--> statement-breakpoint
ALTER TABLE "live_streams" ADD COLUMN "ptz_port" integer;