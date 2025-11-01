CREATE TABLE "reminder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"is_reminder" boolean DEFAULT false NOT NULL,
	"due_date" timestamp,
	"is_completed" boolean DEFAULT false NOT NULL,
	"notification_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feeding_record" ADD COLUMN "food_type" text;--> statement-breakpoint
ALTER TABLE "feeding_record" ADD COLUMN "quantity" text;--> statement-breakpoint
ALTER TABLE "reminder" ADD CONSTRAINT "reminder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reminder_user_due_date_idx" ON "reminder" USING btree ("user_id","due_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reminder_user_created_at_idx" ON "reminder" USING btree ("user_id","created_at" DESC NULLS LAST);