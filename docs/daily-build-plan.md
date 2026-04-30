# CampusStudy AI Daily Build Plan

This plan keeps the project moving in focused daily commits while protecting the product goal: CampusStudy AI should feel like a premium university study workspace on both web and mobile, not a generic chatbot.

## Current State After Live Pilot Push

- Web app has landing, auth, dashboard, courses, material detail, source actions, chat, flashcards, quizzes, and admin flows with live API fallbacks.
- Web material detail can now generate revision notes, flashcard decks, and quiz sets directly from a processed source.
- Mobile app has Expo Router navigation, secure token storage, React Query, premium primitives, live dashboard/courses, flashcards, quizzes, material generation, and source-grounded chat screens.
- Flashcards now support API-backed review scheduling on web and mobile, including due-card state and tactile review loops.
- Quizzes now support focused web/mobile players, scored attempts, answer feedback, topic performance, and backend scoring coverage.
- Backend has auth, course/material schema, upload, processing jobs, extraction, generated study assets, source-scoped RAG chat, generation authorization checks, quiz/flashcard tests, and CI validation gates.
- The seeded web/mobile pilot can now run as a real API-backed session: one-click seeded login, live dashboard shortcuts, discoverable decks/quizzes, persisted RAG chat threads, material-level generation, and a `make pilot-smoke` API flow.

## Product Bar

Every day should improve at least one of these:

- Study usefulness: a student can upload, understand, revise, quiz, or ask better questions.
- Trust: citations, progress states, source previews, strict-source behavior, and clear errors.
- Beauty: premium visual system, intentional motion, tactile interactions, and delightful empty states.
- Mobile practicality: quick review between classes, one-handed flashcards, fast quiz attempts, transcript reading, and offline-friendly cached content.
- Pilot readiness: Docker boot, seed flow, CI, tests, docs, and admin visibility.

## Design Direction

The product should feel like a serious campus study command center:

- Visual language: deep academic night tones, warm paper/gold accents, cyan study-energy highlights, glassy panels, and strong typography hierarchy.
- Interaction language: drag, swipe, reveal, progress, staged generation, citation peeking, transcript timeline taps, and quiz answer feedback.
- Web priority: workspace depth, upload management, source preview, course organization, admin tools, and analytics.
- Mobile priority: speed, review loops, tactile cards, concise notes, quiz focus mode, chat with sources, and transcript skim mode.

## Daily Commit Roadmap

### Day 6 - Mobile Design System + Live Dashboard

- Build shared mobile theme tokens and reusable primitives: screen, card, pill, metric tile, action row, empty state, and loading state.
- Replace inline mobile styles with intentional components.
- Wire mobile dashboard to `/dashboard/overview` with fallback states.
- Add a premium dashboard layout: today stack, due cards, weak topics, latest notes, recent uploads.
- Add mobile validation to CI or at least TypeScript/lint script readiness.

### Day 7 - Mobile Courses + Study Pack Viewer

- Wire mobile courses to live API.
- Add course detail with topics, materials, processing status, and generated study outputs.
- Add beautiful course cards with progress rings and weak-topic hints.
- Add transcript/source preview entry points from course/material screens.
- Add mobile loading, empty, and error states.

### Day 8 - Flashcards Become Real

- Wire mobile flashcard decks/cards to API.
- Build a tactile review screen with reveal, swipe-like actions, difficulty buttons, and due-card state.
- Store reviews through `/flashcards/decks/:id/review`.
- Improve web flashcard review with matching design language.
- Add tests for review scoring/date scheduling behavior.

### Day 9 - Quiz Player Polish

- Wire mobile quiz sets and attempts.
- Build focused quiz mode: question progress, selected answer feedback, explanation reveal, and final score.
- Add web quiz result polish and topic performance summary.
- Add backend tests for quiz attempt scoring and topic performance aggregation.

### Day 10 - RAG Chat With Sources

- Improve web and mobile chat source UX: citation tray, answer style selector, strict-source toggle, and follow-up context. Web and mobile live-pilot flows are now in place.
- Add mobile chat composer with source scope chips. Complete for workspace strict-source threads; material/topic chips remain a future polish slice.
- Harden backend retrieval filters for material/topic/course/workspace scope. Complete for backend workspace/material access.
- Add tests for citations and strict-source behavior. Backend coverage started.

### Day 11 - Material Processing UX

- Add material-level generate buttons for revision notes, flashcards, and quizzes. Complete for web and mobile.
- Add web processing timeline: uploaded, extracting, transcribing, chunking, embedding, generating notes, generating quiz, completed.
- Add mobile material status cards.
- Add retry failed job actions where authorized.
- Improve job logs and failure messages in admin.

### Day 12 - Transcript Experience

- Build web transcript timeline with clickable segments, chapter summaries, and source-linked notes.
- Build mobile transcript reader optimized for skim/review.
- Add audio/video caveat states until real ffmpeg/STT provider is enabled.
- Add transcript segment tests and citation formatting coverage.

### Day 13 - Notes And Study Guides

- Upgrade notes viewer for clean, concise, detailed, glossary, exam questions, teach-me, and revision sheet modes.
- Add mobile study pack viewer with quick switching between modes.
- Add copy/export-friendly layouts.
- Add generated asset freshness/status indicators.

### Day 14 - Admin And Operations

- Improve admin panel: users, uploads, jobs, failures, retry, AI job logs, and basic metrics.
- Add audit log visibility for admin actions.
- Add rate-limit and expensive-endpoint guardrails where missing.
- Add tests for admin authorization and retry behavior.

### Day 15 - Docker Pilot Smoke

- Verify full Docker Compose boot from clean checkout.
- Add a smoke script for API health, seed login, dashboard, material list, and web build.
- Document the exact demo user flow.
- Fix any Docker/env drift.

### Day 16 - Visual Polish Pass

- Web polish: landing, dashboard, upload, material detail, chat, quiz, flashcards, and admin.
- Mobile polish: navigation, spacing, type scale, haptics-ready press states, skeletons, and transitions.
- Remove obvious demo-looking copy where live data exists.
- Add final screenshots/docs notes if useful.

### Day 17 - Realistic AI/RAG Hardening

- Move retrieval closer to pgvector-style database querying.
- Improve prompt injection mitigations and strict source behavior.
- Add schema-repair failure tests.
- Document provider switching and mock-vs-real limitations clearly.

### Day 18 - Pilot Demo Readiness

- Create a full demo script: register/login, upload, processing, notes, quiz, flashcards, RAG chat, admin retry.
- Make seed data richer and more campus-real.
- Add final README updates.
- Confirm CI green and repo clean.

## Daily Commit Style

- Prefer 2-4 commits per day.
- Commit 1 should usually be infrastructure or data contract work.
- Commit 2 should be product-facing UI or workflow.
- Commit 3 should be tests/docs/polish.
- If CI fails, fix it the same day with a clear `fix(...)` or `test(...)` commit.

## Near-Term Priority

Next priority should focus on operational confidence and processing visibility. The next best slice is: processing timeline polish, admin retry UX, Docker smoke verification from a clean checkout, and richer seed data for a complete upload-to-study-pack demo.
