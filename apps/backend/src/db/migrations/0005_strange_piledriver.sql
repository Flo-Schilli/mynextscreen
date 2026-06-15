CREATE TABLE "screen_pairings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"pairing_secret_hash" text NOT NULL,
	"organisation_id" uuid,
	"screen_id" uuid,
	"api_key" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "screen_pairings" ADD CONSTRAINT "screen_pairings_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_pairings" ADD CONSTRAINT "screen_pairings_screen_id_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_screen_pairings_code" ON "screen_pairings" USING btree ("code");