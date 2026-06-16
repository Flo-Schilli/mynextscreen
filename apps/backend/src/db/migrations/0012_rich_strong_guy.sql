ALTER TABLE "schedule_entries" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD COLUMN "priority" text DEFAULT 'normal' NOT NULL;