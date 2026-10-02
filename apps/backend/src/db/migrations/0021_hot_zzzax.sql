ALTER TABLE "screen_remote_controls" ADD COLUMN "last_standby_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "screen_remote_controls" ADD COLUMN "last_standby_ok" boolean;