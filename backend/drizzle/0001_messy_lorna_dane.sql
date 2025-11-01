CREATE TABLE "environmental_target" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"metric_id" integer NOT NULL,
	"zone_id" integer,
	"species" text DEFAULT 'northern_blue_tongued_skink' NOT NULL,
	"min_value" double precision NOT NULL,
	"max_value" double precision NOT NULL,
	"optimal_min" double precision,
	"optimal_max" double precision,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "environmental_target" ADD CONSTRAINT "environmental_target_metric_id_metric_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."metric"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_target" ADD CONSTRAINT "environmental_target_zone_id_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "env_target_metric_zone_species_unique" ON "environmental_target" USING btree ("metric_id","zone_id","species") WHERE is_active = true;