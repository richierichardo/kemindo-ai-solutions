# Kemindo Operations Platform

Local-first Next.js MVP for Kemindo Recruitment Intelligence: requisitions, secure CV intake, local CV parsing, explainable matching, interview assistance, scorecards, and human hiring decisions. HSE, RAG, knowledge base, and reporting remain roadmap foundations.

Plan 01 provides the runtime, environment validation, local PostgreSQL with pgvector, server-side database health checks, and controlled filesystem storage. Domain schema and application features are added by later implementation plans.

## Requirements

- Node.js LTS
- npm
- Docker Desktop with Docker Compose

## Setup

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:up
npm run db:migrate
npm run db:seed:auth
npm run demo:reset
npm run dev
```

Open `http://localhost:3000`. The health endpoint is available at `http://localhost:3000/api/health`.

## Checks

```powershell
npm run typecheck
npm run lint
npm run build
npm run db:health
```

Schema migrations are versioned under `src/db/migrations/` and are generated with `npm run db:generate`. Plan 02 retains a 768-dimensional vector column for future roadmap work; vector indexing and RAG are not part of the active CV/interview MVP.

## Demo login

Run `npm run db:seed:auth` only with `APP_ENV=demo` or `APP_ENV=development`. The idempotent seed creates one demo company, site, and three recruitment users. All demo users use the password `demo-password`:

- `hr.demo@kemindo.local` — upload and manage candidates
- `interviewer.demo@kemindo.local` — complete interview scorecards
- `hiring.manager.demo@kemindo.local` — make the human hiring decision

These credentials are local-demo-only and must be changed before any non-demo deployment.

Stop the local database with:

```powershell
npm run db:down
```

## Environment

Copy `.env.example` to `.env.local`. `APP_ENV` must be explicitly set to one of `demo`, `development`, `test`, or `production`. The DeepSeek key is server-only and must never be referenced by client components.

The demo reset command introduced in a later plan must refuse to run unless `APP_ENV=demo`. Do not point it at a production database.

## Local storage

Private files are kept under `storage/`, outside `public/`:

- `storage/uploads/` — user-uploaded CVs and attachments
- `storage/knowledge-base/` — approved local knowledge documents
- `storage/fixtures/` — generated demo PDFs
- `storage/reports/` — generated reports

The directories are intentionally ignored by Git except for their `.gitkeep` markers.

Candidate intake is vacancy-first and accepts PDF CVs up to 10 MB. Files are stored with generated private paths under `storage/uploads/candidates/`; the original filename is metadata only. CV parsing, deterministic requirement checks, explainable matching, and interview assistance are included in the active MVP.

## Recruitment MVP demo

For a complete deterministic demo, use a local environment and run:

```powershell
Copy-Item .env.example .env.local
# Keep APP_ENV=demo in .env.local
npm run db:up
npm run db:migrate
npm run demo:reset
npm run db:health
npm run dev
```

`npm run demo:reset` refuses to run unless `APP_ENV=demo`. It recreates one demo tenant, five recruitment CV PDF fixtures, parsed CV data, hard-requirement examples, deterministic matching output, a completed interview scorecard, and a pending human hiring decision. It is safe to run repeatedly for the demo tenant and does not call DeepSeek.

Demo flow: log in as HR, review the published vacancy and candidates, open a private CV, inspect parsing and matching, then open Interviews. Use the interviewer credential to review the scorecard and the hiring manager credential to review the summary and record the final human decision.

The active MVP does not include HSE incident workflows, RAG chat, knowledge-base indexing, vector ingestion, reporting, offers, or onboarding. Legacy tables remain in the shared schema for roadmap compatibility.

If the database is unavailable, run `npm run db:up` and wait for PostgreSQL health before migrating. If migrations fail, confirm `DATABASE_URL` and rerun only after checking the database logs. `DEEPSEEK_API_KEY` is read only by server modules; automated tests and the demo reset never call the live provider.
