CREATE TABLE "measurement_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"metric_type" text NOT NULL,
	"value" double precision,
	"unit" text,
	"notes" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "measurement_log" ADD CONSTRAINT "measurement_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "measurement_user_recorded_at_idx" ON "measurement_log" USING btree ("user_id","recorded_at" DESC NULLS LAST);