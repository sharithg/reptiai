CREATE TABLE "alert" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rule_id" bigint NOT NULL,
	"sensor_id" uuid,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"message" text NOT NULL,
	"sample" jsonb DEFAULT '{}' NOT NULL,
	"acknowledged" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_rule" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"metric_id" integer NOT NULL,
	"zone_id" integer,
	"operator" text NOT NULL,
	"threshold_lo" double precision,
	"threshold_hi" double precision,
	"window" interval DEFAULT '10 minutes' NOT NULL,
	"severity" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "alert_rule_name_unique" UNIQUE("name"),
	CONSTRAINT "operator_check" CHECK (operator IN ('<', '<=', '>', '>=', 'between', 'outside'))
);
--> statement-breakpoint
CREATE TABLE "calibration" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sensor_id" uuid NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"method" text NOT NULL,
	"params" jsonb NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "camera_event" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"device_id" uuid NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"score" double precision,
	"meta" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "media_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL,
	"path" text NOT NULL,
	"kind" text NOT NULL,
	"meta" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"unit" text NOT NULL,
	"description" text,
	CONSTRAINT "metric_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "reading" (
	"sensor_id" uuid NOT NULL,
	"metric_id" integer NOT NULL,
	"ts" timestamp NOT NULL,
	"value" double precision NOT NULL,
	"meta" jsonb DEFAULT '{}' NOT NULL,
	CONSTRAINT "reading_sensor_id_metric_id_ts_pk" PRIMARY KEY("sensor_id","metric_id","ts")
);
--> statement-breakpoint
CREATE TABLE "sensor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"zone_id" integer,
	"kind" text NOT NULL,
	"interface" text NOT NULL,
	"address" text,
	"label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "zone" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "zone_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_rule_id_alert_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_sensor_id_sensor_id_fk" FOREIGN KEY ("sensor_id") REFERENCES "public"."sensor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rule" ADD CONSTRAINT "alert_rule_metric_id_metric_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."metric"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rule" ADD CONSTRAINT "alert_rule_zone_id_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration" ADD CONSTRAINT "calibration_sensor_id_sensor_id_fk" FOREIGN KEY ("sensor_id") REFERENCES "public"."sensor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camera_event" ADD CONSTRAINT "camera_event_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading" ADD CONSTRAINT "reading_sensor_id_sensor_id_fk" FOREIGN KEY ("sensor_id") REFERENCES "public"."sensor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading" ADD CONSTRAINT "reading_metric_id_metric_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."metric"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensor" ADD CONSTRAINT "sensor_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensor" ADD CONSTRAINT "sensor_zone_id_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_open_idx" ON "alert" USING btree ("closed_at" NULLS FIRST,"opened_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "media_ts_idx" ON "media_asset" USING btree ("ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reading_ts_desc_idx" ON "reading" USING btree ("ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reading_metric_ts_idx" ON "reading" USING btree ("metric_id","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reading_sensor_ts_idx" ON "reading" USING btree ("sensor_id","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "sensor_device_address_unique" ON "sensor" USING btree ("device_id","address");