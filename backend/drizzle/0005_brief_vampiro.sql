CREATE TABLE "animal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"species" text,
	"description" text,
	"birth_date" timestamp,
	"sex" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feeding_record" ADD COLUMN "animal_id" uuid;--> statement-breakpoint
ALTER TABLE "measurement_log" ADD COLUMN "animal_id" uuid;--> statement-breakpoint
ALTER TABLE "reminder" ADD COLUMN "animal_id" uuid;--> statement-breakpoint
ALTER TABLE "animal" ADD CONSTRAINT "animal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "animal_user_name_unique" ON "animal" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "animal_user_id_idx" ON "animal" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "feeding_record" ADD CONSTRAINT "feeding_record_animal_id_animal_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_log" ADD CONSTRAINT "measurement_log_animal_id_animal_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder" ADD CONSTRAINT "reminder_animal_id_animal_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feeding_record_user_animal_idx" ON "feeding_record" USING btree ("user_id","animal_id");--> statement-breakpoint
CREATE INDEX "measurement_user_animal_idx" ON "measurement_log" USING btree ("user_id","animal_id");--> statement-breakpoint
CREATE INDEX "reminder_user_animal_idx" ON "reminder" USING btree ("user_id","animal_id");