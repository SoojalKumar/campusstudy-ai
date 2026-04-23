# Product Decisions

## Why a modular monolith

The MVP is deliberately a modular monolith so a small university pilot can run it locally or on modest cloud infrastructure without early microservice overhead.

## Why mock-first AI providers

The platform still needs to work without external model keys during setup, testing, and demos. Mock providers make the product operational while keeping real provider integration behind stable interfaces.

## Why RAG citations are first-class

Students need trustworthy answers. Chunks store page numbers, slide numbers, and transcript timestamps so the app can always show where an answer came from.

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

