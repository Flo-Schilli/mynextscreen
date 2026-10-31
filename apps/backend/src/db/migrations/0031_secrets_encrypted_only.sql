-- Secrets must only ever be stored as the SecretCipher envelope (enc:v1:...).
-- NOT VALID: older releases could store these in plaintext when no
-- SECRETS_ENCRYPTION_KEY was configured. The constraints apply to every new
-- write immediately; SecretAtRestMigrationService re-encrypts legacy rows at
-- boot (it needs the key, which SQL does not have) and then runs
-- ALTER TABLE ... VALIDATE CONSTRAINT.
ALTER TABLE "organisation_notification_configs" ADD CONSTRAINT "CHK_org_notification_config_smtp_password_encrypted" CHECK ("organisation_notification_configs"."smtp_password" IS NULL OR "organisation_notification_configs"."smtp_password" = '' OR "organisation_notification_configs"."smtp_password" LIKE 'enc:v1:%') NOT VALID;--> statement-breakpoint
ALTER TABLE "organisation_notification_configs" ADD CONSTRAINT "CHK_org_notification_config_ntfy_token_encrypted" CHECK ("organisation_notification_configs"."ntfy_token" IS NULL OR "organisation_notification_configs"."ntfy_token" = '' OR "organisation_notification_configs"."ntfy_token" LIKE 'enc:v1:%') NOT VALID;--> statement-breakpoint
ALTER TABLE "screen_pairings" ADD CONSTRAINT "CHK_screen_pairings_api_key_encrypted" CHECK ("screen_pairings"."api_key" IS NULL OR "screen_pairings"."api_key" = '' OR "screen_pairings"."api_key" LIKE 'enc:v1:%') NOT VALID;--> statement-breakpoint
ALTER TABLE "screen_remote_controls" ADD CONSTRAINT "CHK_screen_remote_controls_devmode_passphrase_encrypted" CHECK ("screen_remote_controls"."devmode_passphrase" IS NULL OR "screen_remote_controls"."devmode_passphrase" = '' OR "screen_remote_controls"."devmode_passphrase" LIKE 'enc:v1:%') NOT VALID;