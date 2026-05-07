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
make api-dev
```

### 6. Run worker

In another shell:

```bash
make api-worker
```

### 7. Run web

```bash
cd apps/web
cp .env.example .env.local
cd ../..
pnpm --filter @campusstudy/web dev --hostname 127.0.0.1 --port 3001
```

The web default local API is `http://127.0.0.1:8020/api/v1`. If you use another API port, update `apps/web/.env.local` before starting Next.js.

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
make api-worker
make pilot-smoke
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

## Production guardrails

Local development is intentionally easy, but production fails fast when unsafe defaults are present.

Required production settings:

```env
ENVIRONMENT=production
SECRET_KEY=replace-with-at-least-32-random-characters
ENABLE_MOCK_AI=false
LLM_PROVIDER=meta_llama
LLAMA_API_KEY=your_real_provider_key
```

If a private pilot deliberately needs mock AI in production, set:

```env
ALLOW_MOCK_AI_IN_PRODUCTION=true
```

That override should be temporary and documented for the deployment. Without it, the API refuses to start with mock AI enabled so students do not receive fixture-style study outputs from a real production surface.

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

## Local browser demo flow

Use this path when you want the product to work in a real browser without `failed to fetch` surprises.

1. Start infrastructure if you are using Postgres/Redis/MinIO locally: `docker compose -f infrastructure/docker-compose.yml up postgres redis minio minio-init`.
2. Start the API on the local demo port: `cd apps/api && source .venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8020`.
3. In another shell, run migrations and seed data if needed: `make migrate && make seed`.
4. Start the worker when testing uploads or pilot smoke: `make api-worker`.
5. Start web with the matching API URL: `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8020/api/v1 pnpm --filter @campusstudy/web dev --hostname 127.0.0.1 --port 3001`.
6. Open `http://127.0.0.1:3001/login`.
7. Sign in as `maya@student.pacific.edu` / `StudentPass123!`.
8. On Dashboard, use `Recommended demo path` to open the seeded material, latest notes, flashcards, and quiz.
9. Open the material detail page and confirm the completed processing copy says `Study pack ready`.
10. Sign in as the admin account to inspect metrics, users, uploads, and processing jobs.

Common local fixes:

- `Failed to fetch` on login: make sure the API is running at the URL compiled into web, usually `http://127.0.0.1:8020/api/v1`. Restart Next.js after changing `NEXT_PUBLIC_API_BASE_URL`.
- CORS error: use `http://127.0.0.1:3001` or `http://localhost:3001`; both are allowed by default in development. If you choose another web port, add it to `CORS_ORIGINS`.
- Wrong API URL: update `apps/web/.env.local` from `apps/web/.env.example`, then restart `pnpm --filter @campusstudy/web dev`.
- Worker not processing uploads: run `make api-worker` from the same checkout and environment as the API, and keep Redis pointed at the same broker URL.
- Worker is connected but uploads stay pending: confirm the worker boot log lists `app.workers.tasks.process_material_pipeline` under `[tasks]`, then upload again and look for `Task app.workers.tasks.process_material_pipeline received` followed by `succeeded`.
- Web port changed from 3000 to 3001: open `http://127.0.0.1:3001/login` and make sure the API CORS list includes that origin.
- Next.js dev overlay after running build: stop `next dev`, remove `apps/web/.next`, then restart dev. Avoid running `next build` while `next dev` is serving the same workspace.

You can smoke-test the same flow through the API:

```bash
# Terminal 1: API
cd apps/api
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8020

# Terminal 2: worker
make api-worker

# Terminal 3: smoke
API_BASE_URL=http://127.0.0.1:8020/api/v1 make pilot-smoke
```

The smoke test logs in with local student and admin fixtures, checks dashboard/material/deck/quiz endpoints, creates a strict-source RAG thread, uploads a fresh text source, waits for processing, verifies generated study assets, and checks citations for the uploaded material. Keep the API and Celery worker pointed at the same checkout/environment or the uploaded source will remain pending.

If Docker/Redis is unavailable and you still need a fully local worker-backed demo, use a throwaway SQLite smoke environment from the repo root:

```bash
rm -rf /tmp/campusstudy-worker-smoke
mkdir -p /tmp/campusstudy-worker-smoke/uploads

export DATABASE_URL=sqlite:////tmp/campusstudy-worker-smoke/campusstudy.db
export CELERY_BROKER_URL=sqla+sqlite:////tmp/campusstudy-worker-smoke/celery-broker.db
export CELERY_RESULT_BACKEND=db+sqlite:////tmp/campusstudy-worker-smoke/celery-results.db
export FILE_STORAGE_BACKEND=local
export LOCAL_STORAGE_PATH=/tmp/campusstudy-worker-smoke/uploads
export ENABLE_MOCK_AI=true
export LLM_PROVIDER=mock

cd apps/api
python -m app.seed.run
uvicorn app.main:app --host 127.0.0.1 --port 8020

# In another shell with the same exported env values:
cd apps/api
celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --pool=solo

# In a third shell from the repo root with the same exported env values:
API_BASE_URL=http://127.0.0.1:8020/api/v1 python scripts/pilot_smoke.py
```

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
