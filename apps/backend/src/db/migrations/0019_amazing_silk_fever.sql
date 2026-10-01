CREATE TABLE "screen_remote_controls" (
	"screen_id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"agent_id" uuid,
	"local_ip" text,
	"mac_address" text,
	"devmode_passphrase" text,
	"ssap_port" integer DEFAULT 3001 NOT NULL,
	"auto_launch_enabled" boolean DEFAULT true NOT NULL,
	"extend_devmode_enabled" boolean DEFAULT true NOT NULL,
	"devmode_extend_interval_days" integer DEFAULT 7 NOT NULL,
	"wake_before_schedule_enabled" boolean DEFAULT false NOT NULL,
	"wake_lead_time_minutes" integer DEFAULT 10 NOT NULL,
	"wake_on_unreachable_enabled" boolean DEFAULT false NOT NULL,
	"reachability" text DEFAULT 'unknown' NOT NULL,
	"last_probe_at" timestamp with time zone,
	"last_probe_error" text,
	"last_launch_at" timestamp with time zone,
	"last_wake_at" timestamp with time zone,
	"last_devmode_extend_at" timestamp with time zone,
	"last_devmode_extend_ok" boolean,
	"key_status" text DEFAULT 'unknown' NOT NULL,
	"ssh_status" text DEFAULT 'unknown' NOT NULL,
	"ssap_status" text DEFAULT 'unknown' NOT NULL,
	"ssh_host_key_fingerprint" text,
	"onboarding_step" integer DEFAULT 1 NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_agent_enrolments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_agent_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"agent_version" text,
	"last_heartbeat" timestamp with time zone,
	"is_online" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "screen_remote_controls" ADD CONSTRAINT "screen_remote_controls_screen_id_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_remote_controls" ADD CONSTRAINT "screen_remote_controls_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_remote_controls" ADD CONSTRAINT "screen_remote_controls_agent_id_site_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."site_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_agent_enrolments" ADD CONSTRAINT "site_agent_enrolments_agent_id_site_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."site_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_agent_enrolments" ADD CONSTRAINT "site_agent_enrolments_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_agent_sessions" ADD CONSTRAINT "site_agent_sessions_agent_id_site_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."site_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_agent_sessions" ADD CONSTRAINT "site_agent_sessions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_agents" ADD CONSTRAINT "site_agents_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_screen_remote_controls_agent" ON "screen_remote_controls" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "IDX_screen_remote_controls_organisation" ON "screen_remote_controls" USING btree ("organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_site_agent_enrolments_token_hash" ON "site_agent_enrolments" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "IDX_site_agent_enrolments_agent" ON "site_agent_enrolments" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_site_agent_sessions_token_hash" ON "site_agent_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "IDX_site_agent_sessions_family" ON "site_agent_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "IDX_site_agent_sessions_agent" ON "site_agent_sessions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "IDX_site_agents_organisation" ON "site_agents" USING btree ("organisation_id");