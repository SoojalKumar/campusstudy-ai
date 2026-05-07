# Reliability Gate - 2026-05-07

This records the demo-readiness gate after the local CORS, web API handling, and browser UX fixes.

## Manual Browser Demo

Local services used:

- API: `http://127.0.0.1:8020/api/v1`
- Web: `http://127.0.0.1:3001/login`
- Login: `maya@student.pacific.edu` / `StudentPass123!`

Verified in the in-app browser:

- `/login` renders and signs in with the seeded student.
- Wrong password shows `Invalid email or password`.
- API down during login shows `API is not reachable. Make sure backend is running.`.
- `/dashboard` loads seeded metrics, recent uploads, latest notes, study packs, and the `Recommended demo path` links.
- `/materials/{materialId}` loads the seeded material detail without flashing `Material not found` while the query is still loading.
- Completed material copy shows `Study pack ready` and enables notes, flashcards, quiz, and source-chat actions.
- Latest note page loads `Detailed for Graph Traversal`.
- Flashcard deck page loads `Graph Traversal Deck`.
- Quiz page loads `Graph Traversal Quiz`.

Notes:

- Running `next build` while `next dev` was serving the same workspace corrupted the local `.next` dev cache and produced a Next.js dev overlay. Stopping `next dev`, removing `apps/web/.next`, and restarting dev cleared it. This is now documented in the README troubleshooting section.
- The browser plugin console log endpoint continued to include stale pre-restart errors from the earlier dev-cache collision, but fresh DOM checks and screenshots after restart showed the current pages rendering correctly.

## Passed

- Backend tests: `cd apps/api && /tmp/campusstudy-api-gate-py312/bin/python -m pytest`
  - Result: `45 passed, 70 warnings`.
  - Note: the first sandboxed run failed because the local storage test could not write `apps/api/uploads/tests/private-notes.txt`; rerunning with filesystem permission produced the real green signal.
- Backend lint: `cd apps/api && /tmp/campusstudy-api-gate-py312/bin/ruff check --no-cache app alembic --select F,B --ignore B008`
  - Result: passed.
- Web lint: `BUN_INSTALL=/Users/skvidhani/.bun /Users/skvidhani/.bun/bin/bun run --cwd apps/web lint`
  - Result: passed.
- Web build: `NEXT_TEST_WASM_DIR=/Users/skvidhani/Desktop/Projects/campusstudy-ai/node_modules/@next/swc-wasm-nodejs BUN_INSTALL=/Users/skvidhani/.bun /Users/skvidhani/.bun/bin/bun run --cwd apps/web build`
  - Result: passed.
- Mobile typecheck: `BUN_INSTALL=/Users/skvidhani/.bun /Users/skvidhani/.bun/bin/bun run --cwd apps/mobile typecheck`
  - Result: passed.

## Blocked Locally

- Web tests: `BUN_INSTALL=/Users/skvidhani/.bun /Users/skvidhani/.bun/bin/bun run --cwd apps/web test`
  - Result: blocked before tests start.
  - Failure: Rollup native optional dependency `@rollup/rollup-darwin-arm64` fails to load with a macOS code-signature Team ID mismatch.
  - Interpretation: this is a local native dependency/runtime issue, not a failing Vitest assertion. The new API URL and login error-message tests are committed but could not execute in this local environment.

## Demo Startup Reminder

```bash
cd apps/api
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8020
make api-worker # only needed for upload processing / pilot smoke
cd ../..
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8020/api/v1 pnpm --filter @campusstudy/web dev --hostname 127.0.0.1 --port 3001
```

Open `http://127.0.0.1:3001/login` and sign in with `maya@student.pacific.edu` / `StudentPass123!`.
