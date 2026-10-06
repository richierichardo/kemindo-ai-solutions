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

Schema migrations are versioned under `src/db/migrations/` and are generated with `npm run db:generate`. The local RAG vector column uses 768 dimensions for the MVP `nomic-embed-text` embedding model.

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
