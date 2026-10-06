# Kemindo Operations Platform

Local-first Next.js foundation for Recruitment Intelligence and Factory HSE workflows.

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
