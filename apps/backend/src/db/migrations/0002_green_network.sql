ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill: every user that existed before self-signup was introduced (the first-run
-- super-admin and any admin-invited users) is considered verified, so the new login
-- gate (block when email_verified = false) never locks them out.
UPDATE "users" SET "email_verified" = true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pending_email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_change_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_change_token_expires_at" timestamp with time zone;