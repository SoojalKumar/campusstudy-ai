from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.entities import Course, CourseTopic, FlashcardReview, Material, NoteSet, QuizAttempt, TopicMastery, User
from app.schemas.study import DashboardResponse, NoteSetResponse


def build_dashboard(db: Session, *, user: User) -> DashboardResponse:
    due_flashcards = (
        db.query(FlashcardReview)
        .filter(FlashcardReview.user_id == user.id, FlashcardReview.deleted_at.is_(None))
        .count()
    )
    recent_quiz_average = (
        db.query(func.avg(QuizAttempt.score)).filter(QuizAttempt.user_id == user.id).scalar() or 0.0
    )
    weak_topics = (
        db.query(CourseTopic.title, TopicMastery.mastery_score)
        .join(CourseTopic, CourseTopic.id == TopicMastery.topic_id)
        .filter(TopicMastery.user_id == user.id, TopicMastery.deleted_at.is_(None))
        .order_by(TopicMastery.mastery_score.asc())
        .limit(5)
        .all()
    )
    recent_uploads = (
        db.query(Material, Course.title.label("course_title"))
        .join(Course, Course.id == Material.course_id)
        .filter(Material.owner_user_id == user.id, Material.deleted_at.is_(None))
        .order_by(Material.created_at.desc())
        .limit(5)
        .all()
    )
    latest_notes = (
        db.query(NoteSet)
        .filter(NoteSet.user_id == user.id)
        .order_by(NoteSet.created_at.desc())
        .limit(3)
        .all()
    )
    return DashboardResponse(
        streak_days=5,
        due_flashcards=due_flashcards,
        recent_quiz_average=round(float(recent_quiz_average), 2),
        weak_topics=[{"topic": topic_title, "mastery": mastery} for topic_title, mastery in weak_topics],
        recent_uploads=[
            {
                "id": material.id,
                "title": material.title,
                "status": material.processing_stage.value,
                "course_title": course_title,
            }
            for material, course_title in recent_uploads
        ],
        latest_notes=[NoteSetResponse.model_validate(note) for note in latest_notes],
    )
