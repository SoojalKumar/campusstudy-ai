from fastapi import APIRouter

from app.api.routes import (
    admin,
    auth,
    chat,
    courses,
    dashboard,
    enrollments,
    flashcards,
    health,
    materials,
    notes,
    processing,
    quizzes,
    topics,
    transcripts,
    universities,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(universities.router, prefix="/universities", tags=["universities"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(topics.router, prefix="/topics", tags=["topics"])
api_router.include_router(enrollments.router, prefix="/enrollments", tags=["enrollments"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(materials.router, prefix="/materials", tags=["materials"])
api_router.include_router(processing.router, prefix="/processing", tags=["processing"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(flashcards.router, prefix="/flashcards", tags=["flashcards"])
api_router.include_router(quizzes.router, prefix="/quizzes", tags=["quizzes"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(transcripts.router, prefix="/transcripts", tags=["transcripts"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
