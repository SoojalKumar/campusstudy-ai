# CampusStudy AI Engineering Execution Plan

Generated from the CEO review and engineering review on `main`.

## Executive Decision

Recommended mode: selective expansion.

Do not add broad new product features yet. The product already has the right shape:
web workspace, mobile review companion, upload pipeline, generated study assets,
strict-source chat, and admin views. The next work should make the existing product
hard to break.

The engineering goal:

> A student uploads a real source, sees honest processing state, receives cited study
> assets, and can recover cleanly if anything fails.

## Step 0: Scope Challenge

### What already exists

| Problem | Existing code | Plan |
| --- | --- | --- |
| Upload material and create processing job | `apps/api/app/services/materials.py` | Reuse, add explicit enqueue failure handling. |
| Run processing stages | `apps/api/app/services/processing.py` | Reuse, add job claim/idempotency guard before deeper refactor. |
| Retry failed jobs | `apps/api/app/api/routes/processing.py` | Reuse, make retry enqueue failure visible. |
| RAG retrieval | `apps/api/app/services/retrieval.py` | Reuse as fallback/rerank layer, move primary candidate search toward DB/vector query. |
| Source-grounded chat | `apps/api/app/services/chat.py` | Reuse, add stronger tests and retrieval confidence behavior. |
| Web material timeline | `apps/web/app/materials/[materialId]/page.tsx` | Reuse, add clearer failed/pending states after backend fixes. |
| Mobile material timeline | `apps/mobile/app/materials/[materialId].tsx` | Reuse, add matching failed/pending state coverage. |
| Smoke flow | `scripts/pilot_smoke.py` | Extend from seeded-only smoke to real upload-to-study-pack smoke. |

### Minimum complete change set

1. Make queue enqueue failures explicit for upload and retry.
2. Add processing job claim/idempotency guard.
3. Move retrieval from capped in-memory scan to database-first candidate selection.
4. Strengthen tests and smoke flow around upload, retry, processing, RAG, and UI states.
5. Add production config guardrails for dangerous defaults.

### Scope creep to defer

| Deferred | Reason |
| --- | --- |
| LMS integrations | Useful later, not needed to prove upload-to-study-pack reliability. |
| Group study rooms | Product expansion, does not reduce current reliability risk. |
| Full notification system | Nice loop, but queue/job reliability comes first. |
| Real OCR and YouTube import | Valuable, but expands extractor surface before current pipeline is hardened. |
| Full mobile offline mode | Useful, but not blocking pilot confidence. |
| Complete auth rewrite | Use targeted session hardening now. Full auth platform later. |

## Architecture Review

### Issue 1: Silent queue enqueue failure

Finding:

`[P1] (confidence: 10/10) apps/api/app/services/materials.py:136 - Upload creates DB rows, then swallows Celery enqueue failure.`

`[P1] (confidence: 10/10) apps/api/app/api/routes/processing.py:53 - Retry resets the job, then swallows Celery enqueue failure.`

Recommendation: fix completely.

Implementation:

1. Add a small helper, likely in `apps/api/app/services/processing.py`, such as `enqueue_processing_job(db, material, job)`.
2. On enqueue success, append job log: `Queued background processing task.`
3. On enqueue failure, mark job and material `failed`, set `stage=failed`, persist a user-safe error message, append job log, and raise/return a clear API error.
4. Use the same helper in upload and retry paths.

Why:

If Redis/Celery is down, users should not see a fake successful upload that sits pending forever. Silent failure is where trust goes to die.

### Issue 2: Processing task needs idempotency guard

Idempotent means the same operation can run more than once without corrupting results.

Finding:

`[P1] (confidence: 9/10) apps/api/app/services/processing.py:52 - A duplicate task can rerun the whole pipeline and delete/recreate notes, decks, and quizzes while users are using them.`

Recommendation: add a boring job claim, not a new orchestration system.

Implementation:

1. At the start of `run_material_pipeline`, only claim jobs with status `pending` or `failed` after retry.
2. If job is already `running` or `completed`, append no new generated assets and return.
3. Add `locked_at` or `claimed_at` if we want stronger visibility. If avoiding migration for now, use current `status` and `started_at`.
4. Add tests for duplicate task invocation, completed job no-op, and retry after failure.

State machine:

```text
uploaded/pending
      |
      v
running/extracting -> running/chunking -> running/embedding
      |                                      |
      v                                      v
failed <------------------------------- running/generation
      |                                      |
      | retry                                v
      +-------------------------------> completed

Guard:
  completed + duplicate task = no-op
  running + duplicate task   = no-op or explicit already-running result
  failed + retry             = pending, then claimable
```

### Issue 3: Retrieval must move database-first

Finding:

`[P1] (confidence: 9/10) apps/api/app/services/retrieval.py:93 - Retrieval caps material IDs at 250 and chunks at 250, then sorts in Python.`

Recommendation: use database-first candidate retrieval, keep lexical rerank as second pass.

Implementation:

1. Keep current `_score_chunk` as fallback/reranker.
2. Add a repository/helper that fetches candidate chunks with SQL filters by user, course, topic, material, and completed status.
3. For PostgreSQL/pgvector, order by vector distance and limit a larger but bounded candidate set.
4. For SQLite/test mode, keep deterministic Python scoring.
5. Add tests that prove course/topic/material scope and completed-only behavior still hold.

Data flow:

```text
question
  |
  v
embed query
  |
  v
DB scope filter
  | user ownership
  | course/topic/material
  | completed materials only
  v
vector candidate set
  |
  v
lexical + citation rerank
  |
  v
top chunks -> answer -> citations
```

### Issue 4: Production config guardrails

Finding:

`[P1] (confidence: 9/10) apps/api/app/core/config.py:17 - `SECRET_KEY` defaults to `change-me`.`

`[P2] (confidence: 8/10) apps/api/app/providers/factory.py:14 - Embeddings and STT are always mock providers.`

Recommendation: fail fast in production, stay easy locally.

Implementation:

1. In production, startup should fail if `SECRET_KEY=change-me`.
2. In production, startup should fail if `ENABLE_MOCK_AI=true` unless an explicit `ALLOW_MOCK_AI_IN_PRODUCTION=true` escape hatch exists.
3. Document local defaults separately from production requirements.
4. Add config tests.

## Code Quality Review

### Issue 5: Processing service is doing too much

Finding:

`[P2] (confidence: 8/10) apps/api/app/services/processing.py:52 - One function owns extraction, transcription, chunking, embeddings, notes, flashcards, quizzes, state transitions, and failure handling.`

Recommendation: do not rewrite yet. First add guardrails and tests. Then split into small helpers only where it reduces risk.

Right-sized refactor:

1. `claim_processing_job`
2. `set_processing_stage`
3. `replace_transcript_segments`
4. `replace_chunks`
5. `replace_generated_assets`
6. `fail_processing_job`

Do not create a framework. This is not Kubernetes. It is one upload pipeline.

### Issue 6: Error messages need user-safe and operator-detailed separation

Finding:

`[P2] (confidence: 8/10) apps/api/app/services/processing.py:252 - Raw exception strings become material and job error messages.`

Recommendation: store a safe user message and a detailed internal log.

Implementation:

1. Add `safe_error_message` helper by failure type.
2. Keep detailed exception in job logs or metadata.
3. UI shows the safe error, admin can inspect detailed logs.

## Test Review

Detected frameworks:

| Layer | Framework |
| --- | --- |
| API | pytest |
| Web | Vitest |
| Mobile | TypeScript typecheck only |
| E2E | Not present yet |

Coverage diagram:

```text
CODE PATHS                                             USER FLOWS
[+] Upload enqueue                                     [+] Student uploads material
  ├── [★★ TESTED] upload creates job                     ├── [GAP] [->E2E] queue up, upload succeeds, job completes
  ├── [GAP] enqueue fails                                ├── [GAP] [->E2E] queue down, user sees clear failure
  └── [GAP] audit/log written on enqueue failure         └── [GAP] retry failed upload from admin UI

[+] Processing pipeline                                [+] Study asset generation
  ├── [★★ TESTED] extraction formats                     ├── [GAP] duplicate task does not recreate live assets
  ├── [GAP] duplicate running task no-op                 ├── [GAP] failed stage shows recoverable state
  ├── [GAP] completed task no-op                         └── [GAP] generated note/deck/quiz links remain stable
  └── [GAP] retry after failure claims correctly

[+] Retrieval/RAG                                      [+] Source-grounded chat
  ├── [★★ TESTED] lexical preference                     ├── [★★ TESTED] seeded chat returns citations
  ├── [GAP] DB candidate limit does not hide best chunk  ├── [GAP] course with 250+ chunks still finds right source
  ├── [GAP] pgvector branch behavior                     └── [GAP] irrelevant query gets strict-source refusal
  └── [★★ TESTED] completed-only retrieval

[+] Production config                                  [+] Deploy/startup
  ├── [GAP] prod rejects change-me secret                ├── [GAP] production app fails fast before serving traffic
  └── [GAP] prod rejects mock AI without override        └── [GAP] local dev still boots with mock providers

COVERAGE: partial
QUALITY: backend tests are strong for MVP, E2E and production-failure tests are the gap.
```

Required tests:

1. API test: upload enqueue failure marks material/job failed and returns clear error.
2. API test: retry enqueue failure keeps job failed instead of pending forever.
3. API test: duplicate processing task for completed job is no-op.
4. API test: duplicate processing task for running job is no-op.
5. API test: retry after failed job resets and can be claimed once.
6. API test: retrieval with more than 250 chunks still returns relevant scoped chunk in PostgreSQL path, SQLite fallback remains deterministic.
7. API test: production config rejects `SECRET_KEY=change-me`.
8. API test: production config rejects mock AI unless explicitly allowed.
9. Smoke test: real TXT upload, wait for processing, verify notes, flashcards, quiz, RAG citations.
10. Web/component test: failed material state shows clear recovery copy.
11. Web/component test: source chat/generation buttons stay disabled until completed.
12. Mobile type or component-level test if feasible: expired/failed material states do not crash.

## Performance Review

### Issue 7: Retrieval has predictable scaling pain

N+1 means the code runs one query, then many extra queries in a loop. This code is not exactly N+1 right now, but it has a similar scaling smell: it pulls too much into app memory and sorts there.

Finding:

`[P1] (confidence: 9/10) apps/api/app/services/retrieval.py:96 - Query loads chunk rows into Python and scores them in memory.`

Recommendation: DB candidate search first, Python rerank second.

Target:

```text
Small local/test DB:
  SQLite fallback -> deterministic Python scoring

Pilot/Postgres:
  pgvector candidate search -> Python lexical rerank -> top_k citations
```

### Issue 8: Processing memory pressure on large uploads

Finding:

`[P2] (confidence: 7/10) apps/api/app/services/materials.py:46 - Upload reads the full file into memory. Max upload is 250MB.`

Recommendation: defer streaming rewrite, but reduce risk.

Plan:

1. Keep in-memory upload for MVP.
2. Add tests for max-size rejection.
3. Add docs and config around upload size.
4. Later stream to storage and scan without full memory copy.

## Failure Modes

| Flow | Failure | Test? | Handling? | User sees |
| --- | --- | --- | --- | --- |
| Upload enqueue | Redis/Celery unavailable | Gap | Missing | Silent pending today, must become clear failure. |
| Retry enqueue | Queue unavailable during retry | Gap | Missing | Silent pending today, must remain failed with retry message. |
| Duplicate task | Two workers process same job | Gap | Missing | Generated assets can be replaced mid-use. |
| Retrieval | Course has >250 chunks | Gap | Partial | Best source may be missed silently. |
| Production startup | Weak secret in prod | Gap | Missing | Security risk before first request. |
| Production startup | Mock AI in prod | Gap | Missing | Fake study outputs in a real deployment. |
| Large upload | 250MB file read into memory | Partial | Size cap exists | Possible slow upload or memory spike. |

Critical gaps:

1. Queue enqueue failure is silent.
2. Duplicate processing task can mutate generated assets.
3. Retrieval can silently miss correct chunks at scale.

## Commit Plan

## Daily Commit Plan

This is the day-by-day plan for the next reliability push. Each day should end with
local checks passing, GitHub push, and the repo clean.

### Day 19: Queue Failure Truth

Goal:

Uploads and retries must never lie. If the worker queue is down, the material/job
must show a clear failed state instead of staying pending forever.

Commits:

1. `fix(api): surface upload enqueue failures`
2. `fix(api): surface retry enqueue failures`
3. `test(api): cover processing enqueue failure states`

Files:

- `apps/api/app/services/materials.py`
- `apps/api/app/api/routes/processing.py`
- `apps/api/app/services/processing.py`
- `apps/api/app/tests/test_api_contracts.py`
- `apps/api/app/tests/test_api_authz.py`

Tests:

```bash
cd apps/api && source .venv/bin/activate && pytest app/tests/test_api_contracts.py app/tests/test_api_authz.py
```

Done when:

- Upload enqueue failure marks material and job failed.
- Retry enqueue failure keeps job failed with a visible log.
- No broad `except: pass` remains around processing enqueue.

### Day 20: Processing Idempotency

Goal:

Duplicate worker runs must be safe. Idempotency means running the same job twice does
not corrupt or duplicate results.

Commits:

1. `feat(api): claim processing jobs before running`
2. `test(api): cover duplicate processing task behavior`
3. `docs(api): document processing state machine`

Files:

- `apps/api/app/services/processing.py`
- `apps/api/app/tests/test_processing.py`
- `docs/architecture.md`

Tests:

```bash
cd apps/api && source .venv/bin/activate && pytest app/tests/test_processing.py app/tests/test_api_authz.py
```

Done when:

- Completed job + duplicate task is a no-op.
- Running job + duplicate task is a no-op.
- Failed job + admin retry can be claimed again.
- State machine is documented with an ASCII diagram.

### Day 21: RAG Retrieval Scale

Goal:

RAG should not silently miss the right chunk when a course grows. Keep current scoring
as fallback, but make database-first candidate search the default for Postgres.

Commits:

1. `feat(api): add database-first retrieval candidates`
2. `test(api): cover retrieval scope and high-volume chunks`
3. `docs(rag): note sqlite fallback and pgvector path`

Files:

- `apps/api/app/services/retrieval.py`
- `apps/api/app/tests/test_retrieval.py`
- `docs/architecture.md`

Tests:

```bash
cd apps/api && source .venv/bin/activate && pytest app/tests/test_retrieval.py app/tests/test_chat.py
```

Done when:

- Material/topic/course/workspace scope remains enforced.
- Completed-only filtering remains enforced.
- A >250 chunk test does not lose the relevant chunk.
- SQLite fallback remains deterministic for CI.

### Day 22: Production Guardrails

Goal:

Production should fail fast when secrets or AI provider config are unsafe. Local dev
should stay easy.

Commits:

1. `chore(api): validate production settings on startup`
2. `test(api): cover production config guardrails`
3. `docs: document production environment requirements`

Files:

- `apps/api/app/core/config.py`
- `apps/api/app/main.py`
- `apps/api/app/tests/test_config.py`
- `README.md`
- `.env.example`

Tests:

```bash
cd apps/api && source .venv/bin/activate && pytest app/tests/test_config.py
```

Done when:

- `ENVIRONMENT=production` rejects `SECRET_KEY=change-me`.
- Production rejects mock AI unless an explicit escape hatch is set.
- README clearly separates local mock mode from production mode.

### Day 23: Real Upload Smoke

Goal:

The smoke script should prove the real product loop: login, upload, process, notes,
flashcards, quiz, RAG chat, admin visibility.

Commits:

1. `test(pilot): upload source through smoke flow`
2. `test(pilot): verify generated study assets`
3. `docs: update pilot smoke runbook`

Files:

- `scripts/pilot_smoke.py`
- `README.md`
- maybe `apps/api/app/seed/run.py` if fixture data needs one extra course/source

Tests:

```bash
make pilot-smoke
```

Done when:

- Smoke creates a real TXT upload through the API.
- Smoke polls until processing reaches completed or fails loudly.
- Smoke verifies generated notes, deck, quiz, and chat citations from that upload.

### Day 24: Web Recovery UX

Goal:

When processing fails or is pending, web should explain exactly what happened and what
the user can do next.

Commits:

1. `feat(web): clarify material processing failure states`
2. `feat(web): polish admin retry visibility`
3. `test(web): cover material recovery states`

Files:

- `apps/web/app/materials/[materialId]/page.tsx`
- `apps/web/app/admin/page.tsx`
- `apps/web/tests/...`

Tests:

```bash
pnpm --filter @campusstudy/web lint
pnpm --filter @campusstudy/web test
pnpm --filter @campusstudy/web build
```

Done when:

- Failed material page shows clear recovery copy.
- Pending/running material page disables generation/chat safely.
- Admin retry UI matches backend behavior.

### Day 25: Mobile Recovery UX + Full Gate

Goal:

Mobile should match web reliability states, then the full stack should pass the gate.

Commits:

1. `feat(mobile): align material recovery states`
2. `test(mobile): keep recovery flow type-safe`
3. `chore: run full reliability gate`

Files:

- `apps/mobile/app/materials/[materialId].tsx`
- `apps/mobile/lib/api.ts`
- `docs/engineering-execution-plan.md`

Tests:

```bash
cd apps/api && source .venv/bin/activate && pytest
pnpm --filter @campusstudy/web lint
pnpm --filter @campusstudy/web test
pnpm --filter @campusstudy/web build
pnpm --filter @campusstudy/mobile typecheck
make pilot-smoke
```

Done when:

- Mobile failed/pending/completed states are clear and type-safe.
- Backend tests, web validation, mobile typecheck, and pilot smoke all pass.
- Repo is clean and pushed.

### Commit 1: `fix(api): surface processing enqueue failures`

Files:

- `apps/api/app/services/materials.py`
- `apps/api/app/api/routes/processing.py`
- `apps/api/app/services/processing.py`
- `apps/api/app/tests/test_api_contracts.py`
- `apps/api/app/tests/test_api_authz.py`

Ship:

- Shared enqueue helper.
- Upload and retry failure behavior.
- Tests for failed enqueue.

### Commit 2: `feat(api): make processing jobs idempotent`

Files:

- `apps/api/app/services/processing.py`
- `apps/api/app/tests/test_processing.py` or existing auth/contract tests if keeping small

Ship:

- Job claim guard.
- Completed/running duplicate no-op.
- Retry after failure remains valid.

### Commit 3: `feat(api): add database-first rag retrieval`

Files:

- `apps/api/app/services/retrieval.py`
- `apps/api/app/tests/test_retrieval.py`
- optional schema/index migration if needed

Ship:

- Postgres/pgvector path when available.
- SQLite deterministic fallback.
- Scope and completed-only tests.

### Commit 4: `chore(api): enforce production config guardrails`

Files:

- `apps/api/app/core/config.py`
- `apps/api/app/main.py` or startup validation module
- `apps/api/app/tests/test_config.py`
- `README.md`

Ship:

- Fail-fast production checks.
- Local dev remains smooth.
- Docs say exactly which env vars matter.

### Commit 5: `test(pilot): smoke real upload to study pack`

Files:

- `scripts/pilot_smoke.py`
- maybe `README.md`

Ship:

- Multipart upload test.
- Poll processing status.
- Verify notes/deck/quiz/chat citations from uploaded source.

### Commit 6: `feat(web): clarify material failure and recovery states`

Files:

- `apps/web/app/materials/[materialId]/page.tsx`
- `apps/web/app/admin/page.tsx`
- `apps/web/tests/...`

Ship:

- Clear failed/pending/retry UX.
- Disabled generation/chat until complete.
- Admin retry copy matches backend behavior.

### Commit 7: `feat(mobile): align material failure recovery`

Files:

- `apps/mobile/app/materials/[materialId].tsx`
- `apps/mobile/lib/api.ts`

Ship:

- Same status clarity on mobile.
- Better retry/failure copy.
- Typecheck passes.

## Parallelization Strategy

| Step | Modules touched | Depends on |
| --- | --- | --- |
| Enqueue failure handling | API services/routes/tests | None |
| Processing idempotency | API services/tests | Enqueue helper preferred |
| Retrieval upgrade | API retrieval/tests | None |
| Production config guardrails | API config/docs/tests | None |
| Pilot smoke upload | scripts/docs | Enqueue + processing behavior |
| Web recovery UX | web app/tests | Enqueue failure response contract |
| Mobile recovery UX | mobile app | Enqueue failure response contract |

Parallel lanes:

```text
Lane A: enqueue failure -> processing idempotency -> pilot smoke
Lane B: retrieval upgrade
Lane C: production config guardrails
Lane D: web recovery UX -> mobile recovery UX, after Lane A contract is stable
```

Execution order:

1. Launch Lane A, B, C in parallel only if using separate worktrees.
2. Merge A first because it defines error contracts.
3. Merge B and C after tests pass.
4. Run D after A so UI does not chase a moving API contract.

Conflict flags:

- Lane A and B both touch API services/tests, but different service files. Low conflict.
- Lane A and D share API response assumptions. Keep D after A.

## NOT in Scope

- LMS integrations.
- Collaboration and group rooms.
- Notifications.
- OCR and YouTube import.
- Full auth provider replacement.
- Streaming upload rewrite.
- Full production deployment pipeline.

## TODO Candidates

These should become `TODOS.md` entries after the reliability pass:

1. Add real STT provider configuration and one real media smoke.
2. Add mobile runtime QA on simulator/emulator.
3. Add Playwright or equivalent browser E2E for login/upload/chat.
4. Add audit-log viewer for admin actions.
5. Add generated asset freshness/version indicators.

## Completion Summary

- Step 0 Scope Challenge: scope reduced to reliability and trust.
- Architecture Review: 4 issues found.
- Code Quality Review: 2 issues found.
- Test Review: coverage diagram produced, 12 gaps identified.
- Performance Review: 2 issues found.
- NOT in scope: written.
- What already exists: written.
- TODO candidates: 5 proposed.
- Failure modes: 3 critical gaps flagged.
- Parallelization: 4 lanes, 3 can start in parallel, UI waits for API contract.
- Lake Score: complete reliability option recommended for all critical paths.
