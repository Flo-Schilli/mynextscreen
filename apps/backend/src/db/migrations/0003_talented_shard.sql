ALTER TABLE "user_notification_preferences" DROP CONSTRAINT "user_notification_preferences_organisation_id_organisations_id_fk";
--> statement-breakpoint
DROP INDEX "UQ_user_notification_pref_user_org";--> statement-breakpoint
-- Collapse per-org preference rows into one global row per user. A channel is
-- enabled globally if it was enabled in ANY of the user's organisations. The
-- earliest row per user is kept and updated with the consolidated flags.
WITH ranked AS (
  SELECT "id",
         row_number() OVER (PARTITION BY "user_id" ORDER BY "id") AS rn,
         bool_or("in_app_enabled") OVER (PARTITION BY "user_id") AS any_in_app,
         bool_or("email_enabled") OVER (PARTITION BY "user_id") AS any_email,
         bool_or("ntfy_enabled") OVER (PARTITION BY "user_id") AS any_ntfy
  FROM "user_notification_preferences"
)
UPDATE "user_notification_preferences" p
SET "in_app_enabled" = r.any_in_app,
    "email_enabled" = r.any_email,
    "ntfy_enabled" = r.any_ntfy
FROM ranked r
WHERE p."id" = r."id" AND r.rn = 1;--> statement-breakpoint
-- Drop the now-redundant duplicate rows, keeping the consolidated one per user.
WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "user_id" ORDER BY "id") AS rn
  FROM "user_notification_preferences"
)
DELETE FROM "user_notification_preferences" p
USING ranked r
WHERE p."id" = r."id" AND r.rn > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_user_notification_pref_user" ON "user_notification_preferences" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user_notification_preferences" DROP COLUMN "organisation_id";
