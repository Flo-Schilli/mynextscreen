ALTER TABLE "screen_remote_controls" ADD COLUMN "installed_app_id" text;--> statement-breakpoint
ALTER TABLE "screen_remote_controls" ADD COLUMN "installed_app_version" text;--> statement-breakpoint
ALTER TABLE "screen_remote_controls" ADD COLUMN "installed_app_version_at" timestamp with time zone;