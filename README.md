# CampusStudy AI

CampusStudy AI is a university-focused AI study platform. Students upload lectures, PDFs, slides, notes, docs, audio, and video, then turn them into structured study outputs: clean notes, concise notes, detailed notes, flashcards, quizzes, summaries, key concepts, probable exam questions, study guides, and grounded chat answers with citations.

## What is included

- `apps/web`: Next.js App Router web workspace
- `apps/mobile`: Expo React Native mobile companion
- `apps/api`: FastAPI backend with SQLAlchemy, Alembic, Celery, and provider abstractions
- `packages/ui`: shared UI primitives
- `packages/types`: shared TS types
- `infrastructure/docker-compose.yml`: PostgreSQL + pgvector, Redis, MinIO, API, worker, web
- `docs/`: architecture, API surface, and product decisions

## Core MVP capabilities

- local auth with hashed passwords and role-based authorization
- university, department, course, topic, and enrollment structure
- file upload pipeline with background processing jobs
- document extraction for PDF, TXT, Markdown, DOCX, PPTX, plus legacy DOC/PPT via container tools
- speech-to-text abstraction for lecture media
- chunking + embeddings + RAG-ready citations
- generated notes, flashcards, quiz sets, study guides, and revision data
- transcript storage with timestamps
- student dashboard and admin metrics surface
- seed data for local development and smoke testing
- backend unit tests, API integration tests, and a small web component test

## Monorepo structure

```text
campusstudy-ai/
  apps/
    api/
    mobile/
    web/
  packages/
    config/
    types/
    ui/
  infrastructure/
    docker-compose.yml
  docs/
    architecture.md
    api-spec.md
    product-decisions.md
```

## Environment variables

Copy the root env file first:

```bash
cp .env.example .env
```

Important values:

- `DATABASE_URL`
- `REDIS_URL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `SECRET_KEY`
- `ALLOWED_EMAIL_DOMAINS`
- `FILE_STORAGE_BACKEND`
- `S3_ENDPOINT_URL`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`
- `LLM_PROVIDER`
- `LLAMA_API_BASE_URL`
- `LLAMA_API_KEY`
- `ENABLE_MOCK_AI`
- `NEXT_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_API_BASE_URL`

App-local examples also exist:

- `apps/api/.env.example`
- `apps/web/.env.example`
- `apps/mobile/.env.example`

## Local setup without Docker

Start with a prerequisite check:

```bash
make preflight
```

The preflight script reports missing tools, missing local project files, and platform-specific install hints before you start bootstrapping the workspace.

### 1. Install workspace dependencies

```bash
pnpm install
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -e ".[dev]"
cd ../..
```

### 2. Start infrastructure

Bring up PostgreSQL, Redis, and MinIO. You can use Docker only for infra while running apps locally:

```bash
docker compose -f infrastructure/docker-compose.yml up postgres redis minio minio-init
```

### 3. Run migrations

```bash
cd apps/api
source .venv/bin/activate
alembic upgrade head
```

### 4. Seed local development data

```bash
python -m app.seed.run
```

### 5. Run API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Run worker

In another shell:

```bash
cd apps/api
source .venv/bin/activate
celery -A app.workers.celery_app.celery_app worker --loglevel=INFO
```

### 7. Run web

```bash
pnpm --filter @campusstudy/web dev
```

### 8. Run mobile

```bash
pnpm --filter @campusstudy/mobile start
```

## Full Dockerized local development

From the repo root:

```bash
docker compose -f infrastructure/docker-compose.yml up --build
```

Services:

- Web: `http://localhost:3000`
- API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- MinIO console: `http://localhost:9001`

## Makefile shortcuts

```bash
make setup
make migrate
make seed
make api-dev
make docker-up
make docker-down
make test
```

## Local development accounts

- Admin: `admin@pacific.edu` / `AdminPass123!`
- Student: `maya@student.pacific.edu` / `StudentPass123!`
- Student: `jordan@student.pacific.edu` / `StudentPass123!`
- Student: `elena@student.pacific.edu` / `StudentPass123!`

## Switching LLM providers

Default local mode uses the mock provider:

```env
LLM_PROVIDER=mock
ENABLE_MOCK_AI=true
```

To point at a Meta Llama-compatible endpoint:

```env
LLM_PROVIDER=meta_llama
ENABLE_MOCK_AI=false
LLAMA_API_BASE_URL=https://api.llama.com/compat/v1
LLAMA_API_KEY=your_key_here
LLM_MODEL=llama-4-scout
```

The application code talks only to provider interfaces, so you can later add self-hosted inference or other campus-specific model backends without changing the study services.

## Testing

Backend:

```bash
cd apps/api
source .venv/bin/activate
pytest
```

Web component test:

```bash
pnpm --filter @campusstudy/web test
```

CI:

- GitHub Actions runs backend lint + pytest and web lint + test + build on every push to `main` and on pull requests.
- Local `make preflight` is the fastest way to catch missing dependencies before pushing.

## Local smoke flow

1. Start the API, worker, and web app.
2. Run `make seed`.
3. Open `http://localhost:3000/login`.
4. Sign in with one of the local development accounts above.
5. Open Dashboard, then use `Study Packs` to jump into an API-backed flashcard deck and quiz set.
6. Start a source-grounded chat from Dashboard or the Study tab, ask a question, and inspect citations from uploaded chunks.
7. Open a material detail page and use `Generate revision notes`, `Generate flashcard deck`, or `Generate quiz set`.
8. Run the Expo mobile app, sign in, then open the Study tab for synced deck/quiz/chat entry points.
9. Sign in as the local admin account to inspect metrics, users, uploads, and processing jobs.

You can smoke-test the same flow through the API:

```bash
make pilot-smoke
```

The smoke test logs in with local student and admin fixtures, checks dashboard/material/deck/quiz endpoints, creates a strict-source RAG thread, posts a question, and verifies citations exist.

## Known limitations

- Real speech-to-text is abstracted but defaults to a working mock provider for local MVP reliability.
- Meta Llama integration is implemented against a compatible chat-completions shape and may require endpoint-specific tuning in production.
- Web and mobile no longer ship client-side demo fallbacks; signed-out users see real auth/empty states, and study data comes from the API.
- Offline mobile caching is designed for later extension rather than fully implemented in this pass.

## Future roadmap

- collaborative notes and group study rooms
- professor-curated course packs
- OCR, YouTube import, and LMS integrations
- notifications, reminders, and analytics
- campus-specific rollout controls and moderation flows
