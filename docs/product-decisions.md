# Product Decisions

## Why a modular monolith

The MVP is deliberately a modular monolith so a small university pilot can run it locally or on modest cloud infrastructure without early microservice overhead.

## Why mock-first AI providers

The platform still needs to work without external model keys during setup, testing, and local evaluation. Mock providers make the product operational while keeping real provider integration behind stable interfaces.

## Why RAG citations are first-class

Students need trustworthy answers. Chunks store page numbers, slide numbers, and transcript timestamps so the app can always show where an answer came from.

## Why strict chat refuses empty sources

When strict-source mode is enabled, the assistant should not improvise if no chunks are retrieved. The API now returns a clear guardrail answer and zero citations so students understand they need to upload or select better source material.

## Why seed data remains local-only

The local MVP still needs realistic fixtures for smoke tests and onboarding, but production-facing web and mobile surfaces should not look like fixture sandboxes. Seeded student/admin accounts remain available through normal sign-in and automated smoke flows while still exercising hashed-password auth, JWT sessions, authorization, decks, quizzes, persisted chat threads, and admin metrics.

## Why material generation is owner-scoped

Uploaded student materials are private study assets by default. Generation endpoints now enforce the same ownership boundary as retrieval, so one student cannot create notes, decks, or quizzes from another student's upload.

## Why both web and mobile now

Students often upload on desktop but review on phone. The web app is the workspace; the mobile app is the repetition and quick-study companion.

## Designed but not fully built yet

- collaborative notes
- group study rooms
- professor-approved course packs
- LMS integrations
- OCR and YouTube import
- notifications and analytics
- multi-tenant campus controls
