CREATE TYPE "public"."cv_parse_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "candidate_documents" ADD COLUMN "parse_status" "cv_parse_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "candidate_documents" ADD COLUMN "parsed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "candidate_documents" ADD COLUMN "parse_error" text;