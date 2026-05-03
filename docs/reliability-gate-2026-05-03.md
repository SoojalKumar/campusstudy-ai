# Reliability Gate - 2026-05-03

This records the Day 25 reliability gate run after the processing, smoke, web recovery,
and mobile recovery commits. The goal is to keep the gate factual: passed checks are
listed as passed, and local-environment blockers are listed with the exact observed
failure mode.

## Passed

- Backend tests: `cd apps/api && /tmp/campusstudy-api-py312/bin/python -m pytest`
  - Result: `44 passed, 70 warnings`.
  - Note: the first sandboxed run failed because the local storage test could not create `apps/api/uploads`; rerunning with filesystem permission produced the real green signal.
- Web lint: `BUN_INSTALL=/Users/skvidhani/.bun /Users/skvidhani/.bun/bin/bun run --cwd apps/web lint`
  - Result: passed.
- Web build: `NEXT_TEST_WASM_DIR=/Users/skvidhani/Desktop/Projects/campusstudy-ai/node_modules/@next/swc-wasm-nodejs BUN_INSTALL=/Users/skvidhani/.bun /Users/skvidhani/.bun/bin/bun run --cwd apps/web build`
  - Result: passed.
- Mobile typecheck: `BUN_INSTALL=/Users/skvidhani/.bun /Users/skvidhani/.bun/bin/bun run --cwd apps/mobile typecheck`
  - Result: passed.
- Mobile recovery runtime assertions: `BUN_INSTALL=/Users/skvidhani/.bun /Users/skvidhani/.bun/bin/bun apps/mobile/lib/material-status.test.ts`
  - Result: passed.

## Blocked Locally

- Web tests: `BUN_INSTALL=/Users/skvidhani/.bun /Users/skvidhani/.bun/bin/bun run --cwd apps/web test`
  - Result: blocked before tests start.
  - Failure: Rollup native optional dependency `@rollup/rollup-darwin-arm64` fails to load with a macOS code-signature Team ID mismatch.
  - Interpretation: this is a local native dependency/runtime issue, not a failing Vitest assertion.
- Mobile lint: `BUN_INSTALL=/Users/skvidhani/.bun /Users/skvidhani/.bun/bin/bun run --cwd apps/mobile lint`
  - Result: blocked before lint starts.
  - Failure: Expo found no ESLint config and attempted to install `eslint` and `eslint-config-expo`, then failed because `pnpm` was not on the command PATH.
  - Interpretation: mobile currently gates on TypeScript; adding an explicit ESLint setup should be a separate tooling task.
- Pilot smoke against default port 8000: `PYTHONPYCACHEPREFIX=/tmp/campusstudy-pycache API_BASE_URL=http://127.0.0.1:8000/api/v1 python3 scripts/pilot_smoke.py`
  - Result: seeded flow reached the app but failed at `GET /notes/{note_id}`.
  - Failure: the API process on port 8000 is stale; OpenAPI only lists `/notes/generate`, `/notes/by-material/{material_id}`, and `/notes/by-course/{course_id}`.
- Pilot smoke against current port 8010: `PYTHONPYCACHEPREFIX=/tmp/campusstudy-pycache API_BASE_URL=http://127.0.0.1:8010/api/v1 python3 scripts/pilot_smoke.py`
  - Result: seeded login, dashboard, note reader, transcript endpoint, flashcard review, quiz attempt, seeded RAG citations, and upload acceptance passed.
  - Failure: the uploaded material stayed `pending/uploaded` until the 90 second timeout.
  - Interpretation: current API is up on 8010, but no matching worker processed the queued upload job.

## Next Gate Fix

For a fully green local pilot smoke, run the API and worker from the same checkout and
environment, then target that API explicitly:

```bash
cd apps/api
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8010
celery -A app.workers.celery_app.celery_app worker --loglevel=INFO
cd ../..
API_BASE_URL=http://127.0.0.1:8010/api/v1 make pilot-smoke
```

