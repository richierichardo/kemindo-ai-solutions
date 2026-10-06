CREATE TYPE "public"."vacancy_status" AS ENUM('draft', 'published', 'closed');--> statement-breakpoint
ALTER TABLE "vacancies" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "vacancies" ALTER COLUMN "status" SET DATA TYPE "public"."vacancy_status" USING "status"::text::"public"."vacancy_status";--> statement-breakpoint
ALTER TABLE "vacancies" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "job_requisitions" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_requisitions" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_requisitions" ADD COLUMN "rejected_by" uuid;--> statement-breakpoint
ALTER TABLE "job_requisitions" ADD COLUMN "rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_requisitions" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "vacancies" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "vacancies" ADD COLUMN "published_by" uuid;--> statement-breakpoint
ALTER TABLE "vacancies" ADD COLUMN "updated_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;