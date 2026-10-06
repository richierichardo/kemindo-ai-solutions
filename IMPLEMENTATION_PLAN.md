# MVP Implementation Plan

## Current MVP Scope Override

The active project scope is Recruitment Intelligence only:

```text
CV upload → CV parsing → candidate matching → interview questions → scorecard → interview summary → human hiring decision
```

HSE workflows, RAG chatbot/indexing, executive reporting, HSE fixtures, and offline incident reporting are deferred. The existing Plan 01 and Plan 02 commits remain valid foundations; unused HSE/RAG/report tables are retained for future roadmap work and are not part of the MVP acceptance criteria.

The active implementation sequence is:

1. Plan 03 — simplified recruitment auth and demo roles
2. Plan 04 — recruitment shell and design system
3. Plan 05 — requisition, vacancy, and job requirements
4. Plan 06 — candidate intake, CV upload, and local file security
5. Plan 07 — CV extraction, structured parsing, and deterministic requirements
6. Plan 08 — candidate matching explanation and human review
7. Plan 09 — interview scheduling, questions, scorecards, and summary
8. Plan 10 — demo reset, tests, and delivery hardening

The legacy plan descriptions below are retained as historical planning notes. They are not active requirements when they mention HSE, RAG, knowledge-base indexing, reports, or HSE fixtures.

## Working Agreement

- One plan equals one coherent commit.
- Finish and test a plan before moving to the next one.
- Commit messages use `feat(scope): ...`, `test(scope): ...`, or `chore(scope): ...`.
- Every plan must leave the project runnable.
- The demo reset command must always target a demo environment.

## Plan 01 — Root Project and Local Runtime

### Scope

- Create the Next.js TypeScript root project.
- Configure App Router and strict TypeScript.
- Add environment validation.
- Add local PostgreSQL and pgvector setup.
- Add the initial `README.md` and `.env.example`.
- Add the local `storage/` directory structure.

### Acceptance criteria

- The app starts locally.
- The database connection succeeds.
- The app refuses to start with missing required environment variables.

### Commit

```text
chore(root): initialize local nextjs fullstack runtime
```

## Plan 02 — Database Schema and Migrations

### Scope

- Implement organisation, identity, recruitment, HSE, RAG, job, report, and audit tables.
- Enable pgvector.
- Add indexes and unique constraints from `ERD.md`.
- Add migration and database health check.

### Acceptance criteria

- A fresh database migrates successfully.
- Both applications can use the same database.

### Commit

```text
feat(db): add shared recruitment and hse schema
```

## Plan 03 — Authentication, Roles, and Scope

### Scope

- Implement local authentication.
- Add roles: group HR admin, company HR, hiring manager, interviewer, HSE officer, site manager.
- Add company and site scopes.
- Add route protection and permission helpers.

### Acceptance criteria

- A user cannot access another company or site outside the assigned scope.
- Demo users can log in.

### Commit

```text
feat(auth): add role and organisation scope control
```

## Plan 04 — Shared Application Shell and Design System

### Scope

- Implement the authenticated layout.
- Apply only `#000000`, `#830000`, `#BC0202`, and `#FF0000`.
- Build navigation, environment indicator, table, form, status, empty, and error components.
- Add responsive behaviour for desktop and tablet.

### Acceptance criteria

- No unapproved palette colour is used.
- Navigation visibility follows permissions.
- Shared UI states exist.

### Commit

```text
feat(ui): add kemindo operations design system
```

## Plan 05 — Recruitment Requisition and Vacancy Flow

### Scope

- Create requisition form.
- Add company, division, site, job family, shift, employment type, and requirements.
- Implement approval state transitions.
- Implement vacancy creation and publication state.

### Acceptance criteria

- HR can create a requisition and hiring manager can approve it.
- Invalid state transitions are rejected.

### Commit

```text
feat(recruitment): add requisition and vacancy workflow
```

## Plan 06 — Candidate Intake and Local File Handling

### Scope

- Add candidate creation and application flow.
- Implement local CV upload.
- Add file size, MIME, checksum, and path traversal validation.
- Store files outside `public/`.
- Add candidate detail screen.

### Acceptance criteria

- CVs are stored locally and are access-controlled.
- Duplicate files are detected by checksum.

### Commit

```text
feat(recruitment): add candidate intake and local cv storage
```

## Plan 07 — Dummy PDF Generator and Seed Data

### Scope

- Add a deterministic PDF generator.
- Generate exactly 5 recruitment PDFs.
- Generate exactly 5 HSE PDFs.
- Add seed records for companies, sites, users, vacancies, candidates, interviews, incidents, and actions.
- Keep generated files under the demo fixture directory.

### Acceptance criteria

- The generator creates 10 PDFs with stable content.
- The generator can run repeatedly without duplicate fixture records.

### Commit

```text
feat(demo): add deterministic recruitment and hse pdf fixtures
```

## Plan 08 — Local Document Ingestion and RAG Index

### Scope

- Parse local PDFs.
- Chunk and normalise text.
- Generate local embeddings.
- Store document metadata, chunks, and vectors in PostgreSQL.
- Add indexing status and retry handling.
- Implement event and job handling for document ingestion.

### Acceptance criteria

- The 10 generated PDFs can be indexed.
- Indexing is idempotent.
- Failed indexing is visible and retryable.

### Commit

```text
feat(rag): add local pdf ingestion and vector indexing
```

## Plan 09 — DeepSeek Provider and Grounded Assistant

### Scope

- Add DeepSeek provider adapter.
- Configure `deepseek-flash`.
- Add internal `POST /api/ai/chat` route.
- Add prompt templates.
- Retrieve local chunks before generation.
- Add citations and no-evidence fallback.
- Record AI runs.

### Acceptance criteria

- API credentials remain server-side.
- The assistant answers from retrieved local context.
- Mock provider tests pass without a live API.

### Commit

```text
feat(ai): add deepseek flash grounded assistant
```

## Plan 10 — AI CV Parsing and Candidate Matching

### Scope

- Extract text from CVs.
- Generate structured candidate data.
- Add deterministic hard-requirement checks.
- Add AI-assisted fit explanation.
- Store model, status, output, and evidence.
- Add human review controls.

### Acceptance criteria

- Candidate matching explains its evidence.
- Missing hard requirements cannot be hidden by a high semantic score.
- Candidate decisions remain human-controlled.

### Commit

```text
feat(ai): add cv parsing and explainable candidate matching
```

## Plan 11 — Interview and Hiring Decision Flow

### Scope

- Add interview scheduling.
- Generate interview questions from job description and knowledge base.
- Add structured scorecard.
- Add interview summary generation.
- Add hiring manager decision and audit trail.

### Acceptance criteria

- Interviewers can submit scores.
- Hiring decisions show human evidence and audit records.

### Commit

```text
feat(recruitment): add interview scorecards and hiring decisions
```

## Deferred Roadmap — HSE Incident and Corrective Action Flow

### Scope

- Build incident and near-miss form.
- Add local attachment handling.
- Add offline draft storage with IndexedDB.
- Add incident review and confirmed severity.
- Add corrective actions, PIC, deadlines, and status.

### Acceptance criteria

- A user can create an incident draft offline and submit it later.
- HSE can confirm severity and assign corrective actions.
- Overdue actions are visible.

### Commit

```text
feat(hse): add offline incident and corrective action workflow
```

## Deferred Roadmap — Dashboard and Automated Reporting

### Scope

- Add recruitment dashboard.
- Add HSE dashboard.
- Calculate KPI values in application code.
- Add local report generation jobs.
- Use DeepSeek only for executive narrative.
- Add report history and citations.

### Acceptance criteria

- KPI values are reproducible without AI.
- AI narrative is linked to the calculated facts.
- Reports can be regenerated.

### Commit

```text
feat(reporting): add recruitment and hse executive reports
```

## Deferred Roadmap — Original Demo Reset, Test Cases, and Quality Gate

### Scope

- Implement `npm run demo:reset`.
- Clear demo database safely.
- Remove generated demo files and reports.
- Generate 10 PDFs.
- Seed records.
- Ingest and embed documents.
- Run unit, integration, permission, RAG, and workflow tests.
- Print a test summary.

### Acceptance criteria

- A fresh demo state can be recreated with one command.
- Running the command twice produces the same logical fixture state.
- The command refuses to run outside the demo environment.

### Commit

```text
test(demo): add deterministic reset and end-to-end test suite
```

## Deferred Roadmap — Demo Hardening and Delivery Package

### Scope

- Add loading, empty, error, permission, AI failure, and offline states.
- Add audit log review screen.
- Add final README setup and demo script.
- Add architecture and data-flow diagrams.
- Verify local setup from a clean database.
- Prepare the application for live demonstration.

### Acceptance criteria

- A reviewer can run the system from the README.
- The complete recruitment and HSE demo works from a clean reset.
- The repository clearly separates live MVP features from roadmap concepts.

### Commit

```text
chore(delivery): harden and package kemindo demo
```

## Deferred Original Demo Sequence

1. Run the local stack.
2. Run `npm run demo:reset`.
3. Log in as Group HR Admin.
4. Create or open a factory recruitment requisition.
5. Review AI candidate matching.
6. Complete an interview scorecard.
7. Open the RAG assistant and ask about the role or site SOP.
8. Log in as HSE Officer.
9. Submit a factory incident and assign corrective action.
10. Open the recruitment and HSE reports.
11. Explain the chemical, logistics, and factory roadmap from the PPT.
