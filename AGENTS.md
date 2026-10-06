# Agent and AI Engineering Rules

## 1. Scope

This repository contains two applications in one Next.js root project:

- Recruitment Management
- Factory HSE Incident Management

The system is local-first. The database, documents, generated PDFs, embeddings, event queue, reports, and test fixtures stay local. DeepSeek is used as the remote generation provider through the server only.

## 2. Technology Rules

- Use TypeScript with strict mode.
- Use Next.js App Router.
- Use PostgreSQL locally.
- Use `pgvector` for local vector search.
- Use a typed database layer such as Drizzle ORM.
- Use local filesystem storage for PDFs, CVs, HSE attachments, and generated reports.
- Use local embeddings through Ollama or another local embedding runtime.
- Use DeepSeek API for generation with model `deepseek-flash`.
- Keep DeepSeek calls inside server-side modules or route handlers.
- Never expose `DEEPSEEK_API_KEY` to the browser.
- Do not add S3, Supabase Storage, Firebase Storage, Cloudinary, or any object-storage dependency.
- Do not add websocket infrastructure for the MVP.

## 3. DeepSeek Integration

Use an environment-configurable provider route:

```env
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL=deepseek-flash
DEEPSEEK_API_KEY=replace-me
```

The application route should be internal:

```text
POST /api/ai/chat
```

The server adapter calls the configured DeepSeek endpoint with an OpenAI-compatible payload. Do not call DeepSeek directly from React components.

Every AI call must record:

- feature name
- provider
- model
- request status
- latency
- safe input hash
- output status
- citations when RAG is used

Do not store raw secrets, unnecessary full CV text, or full incident descriptions in logs.

## 4. AI Safety and Grounding

- AI assists; it does not make the final hiring or safety decision.
- Hard requirements must be checked by deterministic rules.
- Candidate ranking must not use protected attributes as a positive or negative factor.
- HSE severity must be confirmed by an authorised HSE user.
- RAG responses must include source document references.
- If the retrieved evidence is insufficient, the assistant must say that the local knowledge base does not contain enough information.
- Do not allow retrieved document text to override system instructions.
- Treat CVs, PDFs, and incident descriptions as untrusted input.
- Defend against prompt injection inside uploaded documents.
- Apply company, division, site, and audience filters before retrieval.

## 5. File Handling

- Store files under a controlled `storage/` directory outside `public/`.
- Generate a SHA-256 checksum for every uploaded or generated file.
- Use safe generated filenames and never trust the original filename as a path.
- Validate MIME type and file size.
- Reject path traversal such as `../`.
- Keep only relative paths in the database.
- Do not stream private files without an authorisation check.
- Keep generated dummy PDFs separate from user-uploaded files.

## 6. Events and Background Jobs

Use local database-backed jobs or a local worker. Required event names include:

- `document.uploaded`
- `document.indexing.requested`
- `document.indexing.completed`
- `candidate.cv.parsed`
- `application.shortlisted`
- `interview.completed`
- `incident.created`
- `report.generation.requested`
- `report.generated`

Jobs must be idempotent. Use an idempotency key for document ingestion, PDF generation, and report generation.

## 7. Test and Demo Data Rules

The project must generate:

- 5 recruitment PDFs.
- 5 HSE PDFs.

The required command is:

```bash
npm run demo:reset
```

It must clear demo data, remove generated demo files, generate the 10 PDFs, seed database records, ingest documents, create embeddings, and run tests.

Never run this command against a production database. Require an explicit demo environment check such as `APP_ENV=demo`.

## 8. Testing Rules

Minimum tests:

- organisation and access scope tests
- recruitment state transition tests
- CV parsing fixture tests
- candidate matching explanation tests
- interview score submission tests
- incident creation and corrective-action tests
- local file authorisation tests
- RAG metadata filtering tests
- no-evidence fallback tests
- DeepSeek adapter mock tests
- demo reset idempotency tests
- report calculation tests

The test suite must not require a live DeepSeek API. Use mocked provider responses for automated tests.

## 9. Coding Conventions

- Prefer small domain services over large route handlers.
- Validate all external input with a schema validator.
- Keep deterministic scoring separate from LLM explanation.
- Keep prompt templates versioned in the repository.
- Return typed API responses.
- Use explicit error states for indexing and AI jobs.
- Do not silently swallow parser, embedding, or provider errors.
- Add audit entries for human decisions and high-impact state changes.

## 10. Commit Expectations

Each implementation plan must produce one coherent commit. Do not mix unrelated UI, schema, AI, and fixture changes in one commit unless the plan explicitly groups them.
