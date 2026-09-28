ALTER TABLE "screens" ADD COLUMN "api_key_fingerprint" text;--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_screens_api_key_fingerprint" ON "screens" USING btree ("api_key_fingerprint");