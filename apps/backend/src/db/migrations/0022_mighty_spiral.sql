ALTER TABLE "screen_remote_controls" ADD COLUMN "last_install_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "screen_remote_controls" ADD COLUMN "last_install_ok" boolean;