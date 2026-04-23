# CampusStudy AI Architecture

CampusStudy AI is a modular monorepo organised around a web client, mobile client, and a Python API with asynchronous workers.

## Runtime layout

- `apps/api`: FastAPI modular monolith with SQLAlchemy models, Alembic migrations, Celery workers, and provider abstractions for LLM, embeddings, speech-to-text, and storage.
- `apps/web`: Next.js App Router experience for landing, auth, dashboard, courses, materials, chat, flashcards, quizzes, and admin views.
- `apps/mobile`: Expo Router application focused on practical student review workflows.
- `packages/types`: shared TypeScript DTOs for UI layers.
- `packages/ui`: shared React components and visual primitives.
- `infrastructure/docker-compose.yml`: local pilot stack with PostgreSQL + pgvector, Redis, MinIO, API, Celery worker, and web.

## Backend shape

- API layer: thin FastAPI routers grouped by domain.
- Service layer: auth, materials, extraction, chunking, study asset generation, chat, processing, and admin operations.
- Data layer: SQLAlchemy 2.0 models with soft deletes, explicit foreign keys, and indexing for common study queries.
- Worker layer: Celery task that drives every upload through extraction, chunking, embeddings, and derived asset generation.

## Processing pipeline

1. `uploaded`
2. `extracting`
3. `transcribing`
4. `chunking`
5. `embedding`
6. `generating_notes`
7. `generating_flashcards`
8. `generating_quiz`
9. `completed`
10. `failed`

Every uploaded material produces:

- original file metadata in `materials`
- storage version in `material_versions`
- chunk rows in `material_chunks`
- transcript rows in `transcript_segments` when media is involved
- derived notes, flashcards, quiz sets, and study guides

## AI abstraction

- `LLMProvider`: structured notes, quiz, flashcards, and RAG answers
- `EmbeddingProvider`: chunk + query embeddings
- `SpeechToTextProvider`: audio/video transcription
- `StorageBackend`: local or S3-compatible object storage

The default local developer experience uses mocked AI providers so the system works without external model credentials. A Meta Llama-compatible provider is included behind environment variables for real model calls.

