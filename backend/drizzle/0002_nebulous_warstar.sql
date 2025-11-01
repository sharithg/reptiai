CREATE TABLE "feeding_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feeding_date" timestamp NOT NULL,
	"consumed" text NOT NULL,
	"notes" text,
	"weight" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "consumed_check" CHECK (consumed IN ('fully', 'partially', 'refused'))
);
--> statement-breakpoint
CREATE TABLE "feeding_record_tag" (
	"feeding_record_id" uuid NOT NULL,
	"feeding_tag_id" bigint NOT NULL,
	"quantity" double precision,
	"quantity_unit" text DEFAULT 'g',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feeding_record_tag_feeding_record_id_feeding_tag_id_pk" PRIMARY KEY("feeding_record_id","feeding_tag_id")
);
--> statement-breakpoint
CREATE TABLE "feeding_tag" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#94a3b8',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feeding_tag_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "feeding_record" ADD CONSTRAINT "feeding_record_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feeding_record_tag" ADD CONSTRAINT "feeding_record_tag_feeding_record_id_feeding_record_id_fk" FOREIGN KEY ("feeding_record_id") REFERENCES "public"."feeding_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feeding_record_tag" ADD CONSTRAINT "feeding_record_tag_feeding_tag_id_feeding_tag_id_fk" FOREIGN KEY ("feeding_tag_id") REFERENCES "public"."feeding_tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feeding_record_feeding_date_idx" ON "feeding_record" USING btree ("feeding_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feeding_record_user_id_idx" ON "feeding_record" USING btree ("user_id");