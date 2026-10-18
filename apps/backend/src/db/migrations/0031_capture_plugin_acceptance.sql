CREATE TABLE "capture_plugin_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"license_sha256" text NOT NULL,
	"source" text NOT NULL,
	"accepted_by_user_id" uuid,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "capture_plugin_license_texts" (
	"license_sha256" text PRIMARY KEY NOT NULL,
	"ndi_license_sha256" text NOT NULL,
	"terms_sha256" text NOT NULL,
	"ndi_license_text" text NOT NULL,
	"terms_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "capture_plugin_acceptances" ADD CONSTRAINT "capture_plugin_acceptances_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_plugin_acceptances" ADD CONSTRAINT "capture_plugin_acceptances_agent_id_site_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."site_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_plugin_acceptances" ADD CONSTRAINT "capture_plugin_acceptances_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_plugin_acceptances" ADD CONSTRAINT "capture_plugin_acceptances_revoked_by_user_id_users_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_capture_plugin_acceptances_agent" ON "capture_plugin_acceptances" USING btree ("agent_id");