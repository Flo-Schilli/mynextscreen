-- D12: the email-verification, password-reset and email-change tokens are now
-- stored as SHA-256 fingerprints instead of plaintext. Existing rows still hold
-- plaintext values that would never match a hashed lookup again, so they are
-- cleared: any verification, reset or email-change link already in flight stops
-- working and has to be requested again. That is the intended trade-off — a
-- stale link is cheap, a readable one is an account takeover.
UPDATE "users" SET
  "email_verification_token" = NULL,
  "email_verification_token_expires_at" = NULL,
  "password_reset_token" = NULL,
  "password_reset_token_expires_at" = NULL,
  "email_change_token" = NULL,
  "email_change_token_expires_at" = NULL,
  "pending_email" = NULL
WHERE "email_verification_token" IS NOT NULL
   OR "password_reset_token" IS NOT NULL
   OR "email_change_token" IS NOT NULL;
