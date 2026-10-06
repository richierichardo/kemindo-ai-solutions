# Kemindo Group Recruitment & HSE Intelligence Platform

## 1. Document Control

- Version: 0.1.0
- Status: MVP planning
- Primary stack: Next.js fullstack with TypeScript
- AI provider: DeepSeek API, model `deepseek-flash`
- Storage constraint: local filesystem and local PostgreSQL only
- Applications in one repository:
  1. Recruitment Management
  2. Factory HSE Incident Management

## 2. Product Summary

This project is a local-first prototype for a group-level recruitment process and a factory HSE incident workflow. The two applications share authentication, company/site configuration, local document ingestion, RAG retrieval, audit logging, and reporting.

The live prototype focuses on:

1. A multi-company recruitment pipeline suitable for chemical, logistics, and factory roles.
2. An HSE incident and near-miss reporting workflow for a factory site.
3. AI-assisted CV extraction, candidate matching, interview support, incident summarisation, and executive reporting.

Chemical, logistics, production, quality, maintenance, and supply-chain solutions remain roadmap modules explained in the presentation deck. They are not represented as completed features.

## 3. Business Context

Kemindo Group publicly presents business areas covering chemical and mining consumables, logistics, energy, agriculture, and manufacturing-related activities. The company also presents a hydrated lime production site and services for mining, pulp and paper, and related industries.

The public information is not sufficient to prove the group's actual internal recruitment or factory pain points. Therefore, operational cases in this project are hypotheses to validate during discovery, not claims about confirmed internal problems.

## 4. Goals

### 4.1 Product goals

- Represent multiple legal entities, divisions, sites, and job families in one system.
- Support an end-to-end recruitment workflow.
- Reduce manual CV review and interview-summary work.
- Provide grounded AI answers from approved local documents.
- Provide structured HSE incident reporting for a factory site.
- Generate repeatable reports from deterministic data and AI-written summaries.
- Make the entire demo reproducible with fresh dummy data.

### 4.2 Technical goals

- Use one Next.js root project with two bounded applications.
- Keep application data, documents, generated PDFs, embeddings, and reports on local storage.
- Use DeepSeek only through a server-side integration route.
- Use local embeddings and local vector retrieval to avoid sending the entire document corpus to the provider.
- Provide one command to clear, regenerate, ingest, seed, and test the demo data.

## 5. Non-goals

- Production payroll, attendance, or employment-contract management.
- Automatic hiring or automatic rejection of candidates.
- Automatic final severity decisions for HSE incidents.
- Real ERP, WMS, TMS, HRIS, or IoT integrations in the MVP.
- Websocket-based realtime updates.
- Object storage or cloud file storage.
- Predictive maintenance or computer vision.
- Presenting hypothetical operational issues as confirmed Kemindo issues.

## 6. User Roles

### Group HR Admin

- Manage companies, divisions, sites, job families, users, and recruitment configuration.
- View group-wide recruitment reports.

### Company HR

- Create requisitions and manage candidates for assigned companies.
- Upload and manage approved recruitment documents.

### Hiring Manager

- Review requisitions and shortlisted candidates.
- Submit interview scores and hiring decisions.

### Interviewer

- View assigned interviews.
- Complete structured interview scorecards.

### HSE Officer

- Create, review, classify, and close incidents.
- Assign corrective actions and monitor deadlines.

### Site Manager

- Review site recruitment and HSE dashboards.
- Approve operational actions.

## 7. Application A: Recruitment Management

### 7.1 Core workflow

1. HR creates a manpower requisition.
2. HR selects company, division, site, job family, employment type, shift, and requirements.
3. Hiring manager approves the requisition.
4. HR creates or publishes a vacancy.
5. Candidate data and CV are entered through the candidate intake flow.
6. The system extracts CV fields and stores the original file locally.
7. Rules filter hard requirements.
8. AI produces an explainable matching result.
9. HR shortlists candidates.
10. The system generates interview questions from the job description and approved documents.
11. Interviewers submit scorecards.
12. AI produces an interview summary with evidence references.
13. The hiring manager approves or rejects the recommendation.
14. HR creates an offer and onboarding checklist.

### 7.2 AI capabilities

- CV text extraction and normalisation.
- Skill, experience, certification, location, and availability extraction.
- Requirement-to-candidate comparison.
- Explainable fit scoring.
- Interview question generation.
- Interview note summarisation.
- Candidate communication draft generation.
- Recruitment dashboard narrative.

AI is advisory. The system must show the factors used and preserve a human decision step.

## 8. Application B: Factory HSE Incident

### 8.1 Core workflow

1. A reporter creates an incident or near-miss report.
2. The reporter selects the company, site, area, shift, and incident type.
3. The reporter records facts, people/assets affected, immediate action, and attachments.
4. The system stores the report locally and creates an incident event.
5. The system applies deterministic required-field validation.
6. AI classifies the report as an assistance signal and generates a short summary.
7. HSE reviews the classification and records the confirmed severity.
8. HSE assigns corrective actions, PICs, and due dates.
9. Site management reviews progress.
10. The system generates a weekly HSE report.

### 8.2 Offline-first behaviour

- The form can save a draft in browser IndexedDB.
- The user can submit when the local backend becomes reachable.
- Attachments are copied to the local filesystem after synchronization.
- The MVP uses polling or manual refresh instead of websocket updates.

## 9. RAG Requirements

### 9.1 Approved document types

- Company profile.
- Business area overview.
- Job descriptions.
- Recruitment policy.
- Interview guide.
- Site information.
- HSE SOP.
- Incident classification guide.
- Onboarding checklist.

### 9.2 RAG pipeline

1. Upload document into a private local directory.
2. Create a document record.
3. Extract text from PDF.
4. Clean and normalise text.
5. Split content into chunks.
6. Generate local embeddings.
7. Store chunks and vectors in PostgreSQL with metadata.
8. Retrieve relevant chunks using semantic search and metadata filters.
9. Build a constrained prompt.
10. Send only the selected context to DeepSeek through the server.
11. Return an answer with document references.

### 9.3 Required metadata

- `company_id`
- `division_id`
- `site_id`
- `audience`
- `document_type`
- `effective_date`
- `version`
- `source_file`

The retrieval layer must filter by user access before semantic ranking.

## 10. Reporting Requirements

### Recruitment reports

- Open requisitions.
- Candidates by stage.
- Candidate aging.
- Interview completion rate.
- Missing documents.
- Requisition SLA risk.
- Time-to-hire.

### HSE reports

- Incidents by site and category.
- Near misses.
- Open corrective actions.
- Overdue actions.
- Confirmed severity distribution.
- Recurring incident categories.

All metrics are calculated by application code. DeepSeek only produces the narrative summary and suggested follow-up questions.

## 11. Dummy Data and PDF Fixtures

The codebase must generate exactly two fixture sets:

- 5 recruitment PDFs.
- 5 HSE PDFs.

The 5 recruitment PDFs should cover company profile, recruitment policy, production operator job description, warehouse supervisor job description, and chemical sales engineer job description.

The 5 HSE PDFs should cover HSE policy, incident classification guide, near-miss procedure, factory emergency response, and corrective-action procedure.

The fixture generator belongs to the coding plan and must be reproducible. It must not depend on manually uploaded files.

## 12. Demo Reset and Test Command

The final project must provide one documented command, for example:

```bash
npm run demo:reset
```

The command must:

1. Clear demo tables safely.
2. Clear generated local fixture files and generated reports.
3. Recreate the 10 PDFs.
4. Seed companies, divisions, sites, users, requisitions, candidates, interviews, incidents, and corrective actions.
5. Ingest and embed the 10 PDFs.
6. Run application test cases.
7. Print a short summary of seeded records and failed tests.

The reset command must be idempotent and must be clearly marked as development/demo-only.

## 13. Success Criteria

- A reviewer can complete the recruitment demo from requisition to report.
- A reviewer can submit an HSE incident and assign corrective action.
- RAG answers cite the local source documents.
- The system refuses or qualifies answers when the local corpus lacks evidence.
- No candidate or incident file is stored in object storage.
- DeepSeek credentials never appear in client-side code.
- `npm run demo:reset` creates a fresh, deterministic demo state.
- All MVP features run from one root project.
