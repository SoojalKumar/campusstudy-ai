# API Surface

Base path: `/api/v1`

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

## Organization

- `GET /universities`
- `GET /courses`
- `GET /courses/{courseId}`
- `GET /topics`
- `GET /enrollments`
- `POST /courses/enrollments`

## Materials

- `GET /materials`
- `POST /materials/upload`
- `GET /materials/{id}`
- `GET /materials/{id}/download`
- `GET /materials/{id}/status`
- `GET /materials/{id}/chunks`
- `DELETE /materials/{id}`

## Processing

- `GET /processing/jobs`
- `GET /processing/jobs/{id}`
- `POST /processing/jobs/{id}/retry`

## Notes / Flashcards / Quizzes

- `POST /notes/generate`
- `GET /notes/by-material/{materialId}`
- `GET /notes/by-course/{courseId}`
- `POST /flashcards/generate`
- `GET /flashcards/decks`
- `GET /flashcards/decks/{id}`
- `POST /flashcards/decks/{id}/review`
- `POST /quizzes/generate`
- `GET /quizzes/sets`
- `GET /quizzes/sets/{id}`
- `POST /quizzes/attempts`
- `GET /quizzes/attempts/{id}`
- `GET /quizzes/performance/overview`

## Chat / Transcript

- `POST /chat/threads`
- `GET /chat/threads`
- `GET /chat/threads/{id}`
- `POST /chat/threads/{id}/messages`
- `GET /transcripts/materials/{id}/transcript`
- `GET /transcripts/segments/{id}`

## Dashboard / Admin

- `GET /dashboard/overview`
- `GET /admin/users`
- `GET /admin/materials`
- `GET /admin/jobs`
- `POST /admin/users/{id}/disable`
- `POST /admin/jobs/{id}/retry`
- `GET /admin/metrics`
