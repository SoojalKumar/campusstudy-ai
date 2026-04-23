from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import get_settings
from app.db.base import Base
from app.db.types import EmbeddingType
from app.models.enums import (
    ChatAnswerStyle,
    ChatScope,
    MaterialKind,
    NoteType,
    ProcessingStage,
    ProcessingStatus,
    QuizQuestionType,
    UserRole,
)

settings = get_settings()


def utc_now() -> datetime:
    return datetime.now(UTC)


class TimestampMixin:
    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid4()))
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)


class University(TimestampMixin, Base):
    __tablename__ = "universities"

    name: Mapped[str] = mapped_column(sa.String(255), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(sa.String(255), unique=True, nullable=False, index=True)
    email_domain: Mapped[str | None] = mapped_column(sa.String(255))
    allow_self_signup: Mapped[bool] = mapped_column(default=True)


class Department(TimestampMixin, Base):
    __tablename__ = "departments"
    __table_args__ = (sa.UniqueConstraint("university_id", "code", name="uq_department_code"),)

    university_id: Mapped[str] = mapped_column(sa.ForeignKey("universities.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    code: Mapped[str] = mapped_column(sa.String(64), nullable=False)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(sa.String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(sa.Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    university_id: Mapped[str | None] = mapped_column(sa.ForeignKey("universities.id"), index=True)
    major: Mapped[str | None] = mapped_column(sa.String(255))
    semester: Mapped[str | None] = mapped_column(sa.String(64))
    avatar_url: Mapped[str | None] = mapped_column(sa.String(1024))
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(default=True, nullable=False)


class Course(TimestampMixin, Base):
    __tablename__ = "courses"
    __table_args__ = (
        sa.UniqueConstraint("university_id", "code", "term", "year", name="uq_course_offering"),
    )

    university_id: Mapped[str] = mapped_column(sa.ForeignKey("universities.id"), nullable=False, index=True)
    department_id: Mapped[str] = mapped_column(sa.ForeignKey("departments.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(sa.String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(sa.Text())
    term: Mapped[str] = mapped_column(sa.String(64), default="Fall")
    year: Mapped[int] = mapped_column(default=2026)
    is_active: Mapped[bool] = mapped_column(default=True)


class CourseTopic(TimestampMixin, Base):
    __tablename__ = "course_topics"

    course_id: Mapped[str] = mapped_column(sa.ForeignKey("courses.id"), nullable=False, index=True)
    parent_topic_id: Mapped[str | None] = mapped_column(sa.ForeignKey("course_topics.id"), index=True)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(sa.Text())


class Enrollment(TimestampMixin, Base):
    __tablename__ = "enrollments"
    __table_args__ = (sa.UniqueConstraint("user_id", "course_id", name="uq_enrollment"),)

    user_id: Mapped[str] = mapped_column(sa.ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(sa.ForeignKey("courses.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(sa.String(32), default="active")
    joined_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=utc_now)


class Material(TimestampMixin, Base):
    __tablename__ = "materials"

    owner_user_id: Mapped[str] = mapped_column(sa.ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(sa.ForeignKey("courses.id"), nullable=False, index=True)
    topic_id: Mapped[str | None] = mapped_column(sa.ForeignKey("course_topics.id"), index=True)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    file_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(sa.String(64), nullable=False)
    mime_type: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)
    storage_key: Mapped[str] = mapped_column(sa.String(1024), nullable=False, unique=True)
    preview_image_url: Mapped[str | None] = mapped_column(sa.String(1024))
    source_kind: Mapped[MaterialKind] = mapped_column(sa.Enum(MaterialKind), nullable=False)
    processing_stage: Mapped[ProcessingStage] = mapped_column(
        sa.Enum(ProcessingStage), default=ProcessingStage.UPLOADED, nullable=False
    )
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        sa.Enum(ProcessingStatus), default=ProcessingStatus.PENDING, nullable=False
    )
    error_message: Mapped[str | None] = mapped_column(sa.Text())
    extracted_text: Mapped[str | None] = mapped_column(sa.Text())
    transcript_text: Mapped[str | None] = mapped_column(sa.Text())
    checksum: Mapped[str | None] = mapped_column(sa.String(255), index=True)
    source_metadata: Mapped[dict[str, Any]] = mapped_column(sa.JSON, default=dict)


class MaterialVersion(TimestampMixin, Base):
    __tablename__ = "material_versions"
    __table_args__ = (sa.UniqueConstraint("material_id", "version_number", name="uq_material_version"),)

    material_id: Mapped[str] = mapped_column(sa.ForeignKey("materials.id"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(nullable=False)
    storage_key: Mapped[str] = mapped_column(sa.String(1024), nullable=False)
    extracted_text: Mapped[str | None] = mapped_column(sa.Text())
    source_metadata: Mapped[dict[str, Any]] = mapped_column(sa.JSON, default=dict)


class ProcessingJob(TimestampMixin, Base):
    __tablename__ = "processing_jobs"

    material_id: Mapped[str] = mapped_column(sa.ForeignKey("materials.id"), nullable=False, index=True)
    task_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    status: Mapped[ProcessingStatus] = mapped_column(
        sa.Enum(ProcessingStatus), default=ProcessingStatus.PENDING, nullable=False
    )
    stage: Mapped[ProcessingStage] = mapped_column(
        sa.Enum(ProcessingStage), default=ProcessingStage.UPLOADED, nullable=False
    )
    attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(sa.Text())
    logs_json: Mapped[list[dict[str, Any]]] = mapped_column(sa.JSON, default=list)
    started_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))


class MaterialChunk(TimestampMixin, Base):
    __tablename__ = "material_chunks"
    __table_args__ = (
        sa.UniqueConstraint("material_id", "chunk_index", name="uq_material_chunk_index"),
        sa.Index("ix_material_chunks_material_page", "material_id", "page_number"),
        sa.Index("ix_material_chunks_material_slide", "material_id", "slide_number"),
    )

    material_id: Mapped[str] = mapped_column(sa.ForeignKey("materials.id"), nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(nullable=False)
    text: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    token_count: Mapped[int] = mapped_column(default=0, nullable=False)
    page_number: Mapped[int | None] = mapped_column(index=True)
    slide_number: Mapped[int | None] = mapped_column(index=True)
    section_heading: Mapped[str | None] = mapped_column(sa.String(255))
    start_second: Mapped[int | None] = mapped_column(index=True)
    end_second: Mapped[int | None] = mapped_column(index=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(sa.JSON, default=dict)
    embedding: Mapped[list[float] | None] = mapped_column(EmbeddingType(settings.embedding_dimensions))


class TranscriptSegment(TimestampMixin, Base):
    __tablename__ = "transcript_segments"
    __table_args__ = (sa.Index("ix_transcript_segments_material_time", "material_id", "start_second"),)

    material_id: Mapped[str] = mapped_column(sa.ForeignKey("materials.id"), nullable=False, index=True)
    start_second: Mapped[int] = mapped_column(nullable=False)
    end_second: Mapped[int] = mapped_column(nullable=False)
    speaker_label: Mapped[str | None] = mapped_column(sa.String(64))
    language: Mapped[str | None] = mapped_column(sa.String(32))
    text: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    translated_text: Mapped[str | None] = mapped_column(sa.Text())


class NoteSet(TimestampMixin, Base):
    __tablename__ = "note_sets"
    __table_args__ = (
        sa.Index("ix_note_sets_scope", "user_id", "course_id", "topic_id", "material_id"),
    )

    user_id: Mapped[str] = mapped_column(sa.ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[str | None] = mapped_column(sa.ForeignKey("courses.id"), index=True)
    topic_id: Mapped[str | None] = mapped_column(sa.ForeignKey("course_topics.id"), index=True)
    material_id: Mapped[str | None] = mapped_column(sa.ForeignKey("materials.id"), index=True)
    note_type: Mapped[NoteType] = mapped_column(sa.Enum(NoteType), nullable=False)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    content_markdown: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(sa.JSON, default=dict)


class StudyGuide(TimestampMixin, Base):
    __tablename__ = "study_guides"

    user_id: Mapped[str] = mapped_column(sa.ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[str | None] = mapped_column(sa.ForeignKey("courses.id"), index=True)
    topic_id: Mapped[str | None] = mapped_column(sa.ForeignKey("course_topics.id"), index=True)
    material_id: Mapped[str | None] = mapped_column(sa.ForeignKey("materials.id"), index=True)
    guide_type: Mapped[str] = mapped_column(sa.String(64), nullable=False)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    content_markdown: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(sa.JSON, default=dict)


class FlashcardDeck(TimestampMixin, Base):
    __tablename__ = "flashcard_decks"

    user_id: Mapped[str] = mapped_column(sa.ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[str | None] = mapped_column(sa.ForeignKey("courses.id"), index=True)
    topic_id: Mapped[str | None] = mapped_column(sa.ForeignKey("course_topics.id"), index=True)
    material_id: Mapped[str | None] = mapped_column(sa.ForeignKey("materials.id"), index=True)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    source_scope: Mapped[str] = mapped_column(sa.String(64), default="material", nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(sa.JSON, default=dict)

    flashcards: Mapped[list["Flashcard"]] = relationship(back_populates="deck", cascade="all, delete-orphan")


class Flashcard(TimestampMixin, Base):
    __tablename__ = "flashcards"
    __table_args__ = (sa.Index("ix_flashcards_deck_order", "deck_id", "order_index"),)

    deck_id: Mapped[str] = mapped_column(sa.ForeignKey("flashcard_decks.id"), nullable=False, index=True)
    front: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    back: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    difficulty: Mapped[str] = mapped_column(sa.String(16), default="medium")
    tags: Mapped[list[str]] = mapped_column(sa.JSON, default=list)
    explanation: Mapped[str | None] = mapped_column(sa.Text())
    order_index: Mapped[int] = mapped_column(default=0, nullable=False)

    deck: Mapped["FlashcardDeck"] = relationship(back_populates="flashcards")


class FlashcardReview(TimestampMixin, Base):
    __tablename__ = "flashcard_reviews"
    __table_args__ = (sa.Index("ix_flashcard_reviews_due", "user_id", "due_at"),)

    flashcard_id: Mapped[str] = mapped_column(sa.ForeignKey("flashcards.id"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(sa.ForeignKey("users.id"), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(nullable=False)
    reviewed_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=utc_now)
    due_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)
    interval_days: Mapped[int] = mapped_column(default=1, nullable=False)
    ease_factor: Mapped[float] = mapped_column(default=2.5, nullable=False)


class QuizSet(TimestampMixin, Base):
    __tablename__ = "quiz_sets"

    user_id: Mapped[str] = mapped_column(sa.ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[str | None] = mapped_column(sa.ForeignKey("courses.id"), index=True)
    topic_id: Mapped[str | None] = mapped_column(sa.ForeignKey("course_topics.id"), index=True)
    material_id: Mapped[str | None] = mapped_column(sa.ForeignKey("materials.id"), index=True)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    difficulty: Mapped[str] = mapped_column(sa.String(16), default="medium", nullable=False)
    question_count: Mapped[int] = mapped_column(default=0, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(sa.JSON, default=dict)


class QuizQuestion(TimestampMixin, Base):
    __tablename__ = "quiz_questions"
    __table_args__ = (sa.Index("ix_quiz_questions_set_order", "quiz_set_id", "order_index"),)

    quiz_set_id: Mapped[str] = mapped_column(sa.ForeignKey("quiz_sets.id"), nullable=False, index=True)
    prompt: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    question_type: Mapped[QuizQuestionType] = mapped_column(sa.Enum(QuizQuestionType), nullable=False)
    options: Mapped[list[str] | None] = mapped_column(sa.JSON)
    correct_answer: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    explanation: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    order_index: Mapped[int] = mapped_column(default=0, nullable=False)


class QuizAttempt(TimestampMixin, Base):
    __tablename__ = "quiz_attempts"

    quiz_set_id: Mapped[str] = mapped_column(sa.ForeignKey("quiz_sets.id"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(sa.ForeignKey("users.id"), nullable=False, index=True)
    score: Mapped[float] = mapped_column(default=0, nullable=False)
    total_questions: Mapped[int] = mapped_column(default=0, nullable=False)
    correct_count: Mapped[int] = mapped_column(default=0, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=utc_now)
    duration_seconds: Mapped[int | None] = mapped_column()


class QuizAttemptAnswer(TimestampMixin, Base):
    __tablename__ = "quiz_attempt_answers"

    quiz_attempt_id: Mapped[str] = mapped_column(sa.ForeignKey("quiz_attempts.id"), nullable=False, index=True)
    quiz_question_id: Mapped[str] = mapped_column(sa.ForeignKey("quiz_questions.id"), nullable=False, index=True)
    submitted_answer: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    is_correct: Mapped[bool] = mapped_column(nullable=False)
    score_awarded: Mapped[float] = mapped_column(default=0, nullable=False)
    feedback: Mapped[str | None] = mapped_column(sa.Text())


class ChatThread(TimestampMixin, Base):
    __tablename__ = "chat_threads"

    user_id: Mapped[str] = mapped_column(sa.ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[str | None] = mapped_column(sa.ForeignKey("courses.id"), index=True)
    topic_id: Mapped[str | None] = mapped_column(sa.ForeignKey("course_topics.id"), index=True)
    material_id: Mapped[str | None] = mapped_column(sa.ForeignKey("materials.id"), index=True)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    scope_type: Mapped[ChatScope] = mapped_column(sa.Enum(ChatScope), nullable=False)
    strict_mode: Mapped[bool] = mapped_column(default=False)
    answer_style: Mapped[ChatAnswerStyle] = mapped_column(
        sa.Enum(ChatAnswerStyle), default=ChatAnswerStyle.CONCISE, nullable=False
    )


class ChatMessage(TimestampMixin, Base):
    __tablename__ = "chat_messages"
    __table_args__ = (sa.Index("ix_chat_messages_thread_created", "thread_id", "created_at"),)

    thread_id: Mapped[str] = mapped_column(sa.ForeignKey("chat_threads.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(sa.String(32), nullable=False)
    content: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(sa.JSON, default=dict)


class ChatCitation(TimestampMixin, Base):
    __tablename__ = "chat_citations"

    chat_message_id: Mapped[str] = mapped_column(sa.ForeignKey("chat_messages.id"), nullable=False, index=True)
    material_chunk_id: Mapped[str] = mapped_column(sa.ForeignKey("material_chunks.id"), nullable=False, index=True)
    source_label: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    snippet: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    page_number: Mapped[int | None] = mapped_column()
    slide_number: Mapped[int | None] = mapped_column()
    start_second: Mapped[int | None] = mapped_column()
    end_second: Mapped[int | None] = mapped_column()


class StudySession(TimestampMixin, Base):
    __tablename__ = "study_sessions"

    user_id: Mapped[str] = mapped_column(sa.ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[str | None] = mapped_column(sa.ForeignKey("courses.id"), index=True)
    topic_id: Mapped[str | None] = mapped_column(sa.ForeignKey("course_topics.id"), index=True)
    started_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=utc_now)
    ended_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column()
    session_type: Mapped[str] = mapped_column(sa.String(64), nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(sa.JSON, default=dict)


class TopicMastery(TimestampMixin, Base):
    __tablename__ = "topic_mastery"
    __table_args__ = (sa.UniqueConstraint("user_id", "topic_id", name="uq_topic_mastery"),)

    user_id: Mapped[str] = mapped_column(sa.ForeignKey("users.id"), nullable=False, index=True)
    topic_id: Mapped[str] = mapped_column(sa.ForeignKey("course_topics.id"), nullable=False, index=True)
    mastery_score: Mapped[float] = mapped_column(default=0, nullable=False)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    weak_reason: Mapped[str | None] = mapped_column(sa.Text())


class AuditLog(TimestampMixin, Base):
    __tablename__ = "audit_logs"

    actor_user_id: Mapped[str | None] = mapped_column(sa.ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(sa.String(255), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(sa.String(64), nullable=False)
    target_id: Mapped[str | None] = mapped_column(sa.String(36), index=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(sa.JSON, default=dict)
    ip_address: Mapped[str | None] = mapped_column(sa.String(64))


class AdminAction(TimestampMixin, Base):
    __tablename__ = "admin_actions"

    admin_user_id: Mapped[str] = mapped_column(sa.ForeignKey("users.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    target_type: Mapped[str] = mapped_column(sa.String(64), nullable=False)
    target_id: Mapped[str | None] = mapped_column(sa.String(36))
    reason: Mapped[str | None] = mapped_column(sa.Text())
    metadata_json: Mapped[dict[str, Any]] = mapped_column(sa.JSON, default=dict)


class SystemSetting(TimestampMixin, Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(sa.String(255), unique=True, nullable=False)
    value_json: Mapped[dict[str, Any]] = mapped_column(sa.JSON, default=dict)
    description: Mapped[str | None] = mapped_column(sa.Text())

