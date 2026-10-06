import {
  boolean, date, index, integer, jsonb, numeric, pgEnum, pgTable,
  primaryKey, text, timestamp, uniqueIndex, uuid, varchar, customType,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

const vector768 = customType<{ data: number[]; driverData: string }>({
  dataType: () => "vector(768)",
  toDriver: (value) => `[${value.join(",")}]`,
  fromDriver: (value) => String(value).slice(1, -1).split(",").map(Number),
});

export const companyStatus = pgEnum("company_status", ["active", "inactive"]);
export const businessArea = pgEnum("business_area", ["chemical", "logistics", "energy", "agriculture", "factory", "other"]);
export const siteType = pgEnum("site_type", ["office", "warehouse", "factory", "mine", "port", "other"]);
export const employmentType = pgEnum("employment_type", ["permanent", "contract", "temporary", "internship"]);
export const requisitionStatus = pgEnum("requisition_status", ["draft", "pending_approval", "approved", "rejected", "closed"]);
export const vacancyStatus = pgEnum("vacancy_status", ["draft", "published", "closed"]);
export const documentType = pgEnum("document_type", ["cv", "certificate", "identity", "portfolio", "other"]);
export const cvParseStatus = pgEnum("cv_parse_status", ["pending", "processing", "completed", "failed"]);
export const consentStatus = pgEnum("consent_status", ["pending", "granted", "withdrawn"]);
export const applicationStage = pgEnum("application_stage", ["applied", "screening", "shortlisted", "interview", "decision", "offer", "onboarding", "rejected", "withdrawn"]);
export const humanDecision = pgEnum("human_decision", ["pending", "approved", "rejected", "on_hold"]);
export const interviewStatus = pgEnum("interview_status", ["scheduled", "in_progress", "completed", "cancelled"]);
export const incidentType = pgEnum("incident_type", ["injury", "near_miss", "property_damage", "environmental", "unsafe_act", "unsafe_condition", "other"]);
export const incidentSeverity = pgEnum("incident_severity", ["low", "medium", "high", "critical"]);
export const incidentStatus = pgEnum("incident_status", ["draft", "submitted", "under_review", "action_open", "closed"]);
export const correctiveActionStatus = pgEnum("corrective_action_status", ["open", "in_progress", "completed", "overdue", "cancelled"]);
export const knowledgeDocumentStatus = pgEnum("knowledge_document_status", ["pending", "indexing", "indexed", "failed", "archived"]);
export const aiFeature = pgEnum("ai_feature", ["rag_chat", "cv_parse", "candidate_match", "interview_summary", "incident_summary", "report_summary"]);
export const aiRunStatus = pgEnum("ai_run_status", ["requested", "running", "completed", "failed"]);
export const jobStatus = pgEnum("job_status", ["queued", "running", "completed", "failed", "cancelled"]);
export const reportStatus = pgEnum("report_status", ["requested", "generating", "completed", "failed"]);

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(), code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(), legalName: varchar("legal_name", { length: 255 }),
  status: companyStatus("status").default("active").notNull(), ...timestamps,
}, (t) => [uniqueIndex("companies_code_uq").on(t.code)]);

export const divisions = pgTable("divisions", {
  id: uuid("id").defaultRandom().primaryKey(), companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 64 }).notNull(), name: varchar("name", { length: 255 }).notNull(),
  businessArea: businessArea("business_area").notNull(), ...timestamps,
}, (t) => [uniqueIndex("divisions_company_code_uq").on(t.companyId, t.code)]);

export const sites = pgTable("sites", {
  id: uuid("id").defaultRandom().primaryKey(), companyId: uuid("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 64 }).notNull(), name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(), timezone: varchar("timezone", { length: 64 }).notNull(),
  siteType: siteType("site_type").notNull(), ...timestamps,
}, (t) => [uniqueIndex("sites_company_code_uq").on(t.companyId, t.code)]);

export const jobFamilies = pgTable("job_families", {
  id: uuid("id").defaultRandom().primaryKey(), code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(), description: text("description"), ...timestamps,
}, (t) => [uniqueIndex("job_families_code_uq").on(t.code)]);

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(), code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(), ...timestamps,
}, (t) => [uniqueIndex("roles_code_uq").on(t.code)]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(), companyId: uuid("company_id").references(() => companies.id),
  siteId: uuid("site_id").references(() => sites.id), email: varchar("email", { length: 320 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(), passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").default(true).notNull(), ...timestamps,
}, (t) => [uniqueIndex("users_email_uq").on(t.email)]);

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => roles.id), ...timestamps,
}, (t) => [primaryKey({ columns: [t.userId, t.roleId] })]);

export const userScopes = pgTable("user_scopes", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => companies.id), divisionId: uuid("division_id").references(() => divisions.id),
  siteId: uuid("site_id").references(() => sites.id), ...timestamps,
}, (t) => [uniqueIndex("user_scopes_scope_uq").on(t.userId, t.companyId, t.divisionId, t.siteId)]);

export const jobRequisitions = pgTable("job_requisitions", {
  id: uuid("id").defaultRandom().primaryKey(), companyId: uuid("company_id").notNull().references(() => companies.id),
  divisionId: uuid("division_id").notNull().references(() => divisions.id), siteId: uuid("site_id").references(() => sites.id),
  jobFamilyId: uuid("job_family_id").notNull().references(() => jobFamilies.id), title: varchar("title", { length: 255 }).notNull(),
  employmentType: employmentType("employment_type").notNull(), shiftRequired: boolean("shift_required").default(false).notNull(),
  status: requisitionStatus("status").default("draft").notNull(), requiredSkills: jsonb("required_skills").$type<string[]>().default([]).notNull(),
  requiredCertifications: jsonb("required_certifications").$type<string[]>().default([]).notNull(), approvedBy: uuid("approved_by").references(() => users.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }), approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedBy: uuid("rejected_by").references(() => users.id), rejectedAt: timestamp("rejected_at", { withTimezone: true }), rejectionReason: text("rejection_reason"),
  createdBy: uuid("created_by").notNull().references(() => users.id), updatedBy: uuid("updated_by").notNull().references(() => users.id), ...timestamps,
}, (t) => [index("requisitions_company_status_idx").on(t.companyId, t.status)]);

export const vacancies = pgTable("vacancies", {
  id: uuid("id").defaultRandom().primaryKey(), requisitionId: uuid("requisition_id").notNull().references(() => jobRequisitions.id),
  title: varchar("title", { length: 255 }).notNull(), description: text("description").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }), closedAt: timestamp("closed_at", { withTimezone: true }),
  status: vacancyStatus("status").default("draft").notNull(), createdBy: uuid("created_by").notNull().references(() => users.id),
  publishedBy: uuid("published_by").references(() => users.id), updatedBy: uuid("updated_by").notNull().references(() => users.id), ...timestamps,
});

export const candidates = pgTable("candidates", {
  id: uuid("id").defaultRandom().primaryKey(), fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(), phone: varchar("phone", { length: 64 }), location: varchar("location", { length: 255 }),
  consentStatus: consentStatus("consent_status").default("pending").notNull(), source: varchar("source", { length: 128 }).notNull(), ...timestamps,
}, (t) => [index("candidates_email_idx").on(t.email)]);

export const candidateDocuments = pgTable("candidate_documents", {
  id: uuid("id").defaultRandom().primaryKey(), candidateId: uuid("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  documentType: documentType("document_type").notNull(), originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  localPath: text("local_path").notNull(), mimeType: varchar("mime_type", { length: 128 }).notNull(), sha256: varchar("sha256", { length: 64 }).notNull(),
  parsedText: text("parsed_text"), parsedData: jsonb("parsed_data"), parseStatus: cvParseStatus("parse_status").default("pending").notNull(),
  parsedAt: timestamp("parsed_at", { withTimezone: true }), parseError: text("parse_error"), ...timestamps,
}, (t) => [uniqueIndex("candidate_documents_sha256_uq").on(t.sha256)]);

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(), vacancyId: uuid("vacancy_id").notNull().references(() => vacancies.id),
  candidateId: uuid("candidate_id").notNull().references(() => candidates.id), stage: applicationStage("stage").default("applied").notNull(),
  fitScore: numeric("fit_score", { precision: 5, scale: 2 }), fitExplanation: jsonb("fit_explanation"),
  humanDecision: humanDecision("human_decision").default("pending").notNull(), ...timestamps,
}, (t) => [uniqueIndex("applications_vacancy_candidate_uq").on(t.vacancyId, t.candidateId)]);

export const interviews = pgTable("interviews", {
  id: uuid("id").defaultRandom().primaryKey(), applicationId: uuid("application_id").notNull().references(() => applications.id),
  interviewerId: uuid("interviewer_id").notNull().references(() => users.id), scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  status: interviewStatus("status").default("scheduled").notNull(), notes: text("notes"), aiSummary: text("ai_summary"), ...timestamps,
});

export const interviewScores = pgTable("interview_scores", {
  id: uuid("id").defaultRandom().primaryKey(), interviewId: uuid("interview_id").notNull().references(() => interviews.id, { onDelete: "cascade" }),
  competency: varchar("competency", { length: 128 }).notNull(), score: integer("score").notNull(), evidence: text("evidence").notNull(), comment: text("comment"), ...timestamps,
}, (t) => [index("interview_scores_interview_idx").on(t.interviewId)]);

export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(), applicationId: uuid("application_id").notNull().references(() => applications.id),
  status: humanDecision("status").default("pending").notNull(), offeredAt: timestamp("offered_at", { withTimezone: true }), acceptedAt: timestamp("accepted_at", { withTimezone: true }), ...timestamps,
});

export const onboardingTasks = pgTable("onboarding_tasks", {
  id: uuid("id").defaultRandom().primaryKey(), applicationId: uuid("application_id").notNull().references(() => applications.id),
  title: varchar("title", { length: 255 }).notNull(), description: text("description"), dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }), completedBy: uuid("completed_by").references(() => users.id), ...timestamps,
});

export const incidents = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(), companyId: uuid("company_id").notNull().references(() => companies.id),
  siteId: uuid("site_id").notNull().references(() => sites.id), reportedBy: uuid("reported_by").notNull().references(() => users.id),
  incidentNumber: varchar("incident_number", { length: 64 }).notNull(), incidentType: incidentType("incident_type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(), area: varchar("area", { length: 255 }).notNull(), description: text("description").notNull(),
  immediateAction: text("immediate_action"), aiCategory: varchar("ai_category", { length: 128 }), aiSummary: text("ai_summary"),
  confirmedSeverity: incidentSeverity("confirmed_severity"), status: incidentStatus("status").default("draft").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id), updatedBy: uuid("updated_by").notNull().references(() => users.id), ...timestamps,
}, (t) => [uniqueIndex("incidents_number_uq").on(t.incidentNumber), index("incidents_site_occurred_idx").on(t.siteId, t.occurredAt)]);

export const incidentAttachments = pgTable("incident_attachments", {
  id: uuid("id").defaultRandom().primaryKey(), incidentId: uuid("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(), localPath: text("local_path").notNull(), mimeType: varchar("mime_type", { length: 128 }).notNull(), sha256: varchar("sha256", { length: 64 }).notNull(), ...timestamps,
}, (t) => [uniqueIndex("incident_attachments_sha256_uq").on(t.sha256)]);

export const correctiveActions = pgTable("corrective_actions", {
  id: uuid("id").defaultRandom().primaryKey(), incidentId: uuid("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  description: text("description").notNull(), ownerId: uuid("owner_id").notNull().references(() => users.id), dueDate: date("due_date").notNull(),
  status: correctiveActionStatus("status").default("open").notNull(), completedAt: timestamp("completed_at", { withTimezone: true }), ...timestamps,
}, (t) => [index("corrective_actions_status_due_idx").on(t.status, t.dueDate)]);

export const incidentEvents = pgTable("incident_events", {
  id: uuid("id").defaultRandom().primaryKey(), incidentId: uuid("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 128 }).notNull(), payload: jsonb("payload").notNull(), createdBy: uuid("created_by").references(() => users.id), ...timestamps,
}, (t) => [index("incident_events_incident_idx").on(t.incidentId, t.createdAt)]);

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").defaultRandom().primaryKey(), companyId: uuid("company_id").references(() => companies.id), divisionId: uuid("division_id").references(() => divisions.id), siteId: uuid("site_id").references(() => sites.id),
  documentType: varchar("document_type", { length: 128 }).notNull(), title: varchar("title", { length: 255 }).notNull(), localPath: text("local_path").notNull(), version: varchar("version", { length: 64 }).notNull(), effectiveDate: date("effective_date"), audience: varchar("audience", { length: 128 }).notNull(), status: knowledgeDocumentStatus("status").default("pending").notNull(), sha256: varchar("sha256", { length: 64 }).notNull(), ...timestamps,
}, (t) => [uniqueIndex("knowledge_documents_sha256_uq").on(t.sha256)]);

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: uuid("id").defaultRandom().primaryKey(), documentId: uuid("document_id").notNull().references(() => knowledgeDocuments.id, { onDelete: "cascade" }), chunkIndex: integer("chunk_index").notNull(), content: text("content").notNull(), tokenCount: integer("token_count").notNull(), embedding: vector768("embedding").notNull(), metadata: jsonb("metadata").notNull(), ...timestamps,
}, (t) => [uniqueIndex("knowledge_chunks_document_index_uq").on(t.documentId, t.chunkIndex), index("knowledge_chunks_document_idx").on(t.documentId)]);

export const aiRuns = pgTable("ai_runs", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").references(() => users.id), feature: aiFeature("feature").notNull(), provider: varchar("provider", { length: 64 }).notNull(), model: varchar("model", { length: 128 }).notNull(), status: aiRunStatus("status").default("requested").notNull(), inputHash: varchar("input_hash", { length: 64 }), outputJson: jsonb("output_json"), error: text("error"), latencyMs: integer("latency_ms"), ...timestamps,
}, (t) => [index("ai_runs_feature_status_idx").on(t.feature, t.status)]);

export const aiCitations = pgTable("ai_citations", {
  id: uuid("id").defaultRandom().primaryKey(), aiRunId: uuid("ai_run_id").notNull().references(() => aiRuns.id, { onDelete: "cascade" }), documentId: uuid("document_id").notNull().references(() => knowledgeDocuments.id), chunkId: uuid("chunk_id").notNull().references(() => knowledgeChunks.id), quote: text("quote"), relevanceScore: numeric("relevance_score", { precision: 8, scale: 6 }), ...timestamps,
});

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(), companyId: uuid("company_id").references(() => companies.id), siteId: uuid("site_id").references(() => sites.id), reportType: varchar("report_type", { length: 128 }).notNull(), periodStart: date("period_start").notNull(), periodEnd: date("period_end").notNull(), metrics: jsonb("metrics").notNull(), narrative: text("narrative"), status: reportStatus("status").default("requested").notNull(), generatedAt: timestamp("generated_at", { withTimezone: true }), createdBy: uuid("created_by").references(() => users.id), ...timestamps,
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(), name: varchar("name", { length: 128 }).notNull(), idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(), status: jobStatus("status").default("queued").notNull(), payload: jsonb("payload").notNull(), attempts: integer("attempts").default(0).notNull(), availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(), startedAt: timestamp("started_at", { withTimezone: true }), completedAt: timestamp("completed_at", { withTimezone: true }), error: text("error"), ...timestamps,
}, (t) => [uniqueIndex("jobs_idempotency_key_uq").on(t.idempotencyKey), index("jobs_status_available_idx").on(t.status, t.availableAt)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(), actorId: uuid("actor_id").references(() => users.id), companyId: uuid("company_id").references(() => companies.id), entityType: varchar("entity_type", { length: 128 }).notNull(), entityId: uuid("entity_id"), action: varchar("action", { length: 128 }).notNull(), beforeData: jsonb("before_data"), afterData: jsonb("after_data"), ...timestamps,
}, (t) => [index("audit_logs_entity_created_idx").on(t.entityType, t.entityId, t.createdAt), index("audit_logs_company_created_idx").on(t.companyId, t.createdAt)]);
