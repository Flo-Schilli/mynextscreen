CREATE TABLE "org_metric_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"screens_online" integer DEFAULT 0 NOT NULL,
	"content_count" integer DEFAULT 0 NOT NULL,
	"playlist_count" integer DEFAULT 0 NOT NULL,
	"open_alerts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_metric_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cpu_percent" integer NOT NULL,
	"ram_percent" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_metric_snapshots" ADD CONSTRAINT "org_metric_snapshots_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_org_metric_snapshots_org_time" ON "org_metric_snapshots" USING btree ("organisation_id","captured_at");--> statement-breakpoint
CREATE INDEX "IDX_system_metric_snapshots_time" ON "system_metric_snapshots" USING btree ("captured_at");