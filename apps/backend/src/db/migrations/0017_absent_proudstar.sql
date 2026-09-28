CREATE TABLE "screen_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"screen_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "screen_sessions" ADD CONSTRAINT "screen_sessions_screen_id_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_sessions" ADD CONSTRAINT "screen_sessions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_screen_sessions_token_hash" ON "screen_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "IDX_screen_sessions_family" ON "screen_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "IDX_screen_sessions_screen" ON "screen_sessions" USING btree ("screen_id");