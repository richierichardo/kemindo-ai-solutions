ALTER TYPE "public"."ai_feature" ADD VALUE 'interview_questions' BEFORE 'interview_summary';--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "questions" jsonb;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "questions_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "questions_error" text;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "summary_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "summary_error" text;--> statement-breakpoint
CREATE UNIQUE INDEX "interview_scores_interview_competency_uq" ON "interview_scores" USING btree ("interview_id","competency");--> statement-breakpoint
CREATE UNIQUE INDEX "interviews_active_application_uq" ON "interviews" USING btree ("application_id") WHERE status IN ('scheduled', 'in_progress');