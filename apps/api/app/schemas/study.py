from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.models.enums import ChatAnswerStyle, ChatScope, NoteType, QuizQuestionType
from app.schemas.common import CamelModel, TimestampsMixin


class NoteGenerationRequest(CamelModel):
    material_id: str | None = None
    topic_id: str | None = None
    course_id: str | None = None
    note_type: NoteType = NoteType.SUMMARY


class NoteSetResponse(TimestampsMixin):
    user_id: str
    course_id: str | None
    topic_id: str | None
    material_id: str | None
    note_type: str
    title: str
    content_markdown: str
    metadata_json: dict


class FlashcardGenerationRequest(CamelModel):
    material_id: str | None = None
    topic_id: str | None = None
    course_id: str | None = None
    limit: int = Field(default=10, ge=1, le=50)


class FlashcardItem(CamelModel):
    front: str
    back: str
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    tags: list[str] = Field(default_factory=list)
    explanation: str | None = None


class FlashcardGenerationResult(CamelModel):
    cards: list[FlashcardItem]


class FlashcardResponse(TimestampsMixin):
    deck_id: str
    front: str
    back: str
    difficulty: str
    tags: list[str]
    explanation: str | None
    order_index: int
    due_at: datetime | None = None


class FlashcardDeckResponse(TimestampsMixin):
    user_id: str
    course_id: str | None
    topic_id: str | None
    material_id: str | None
    title: str
    source_scope: str
    metadata_json: dict
    flashcards: list[FlashcardResponse] = Field(default_factory=list)


class FlashcardReviewRequest(CamelModel):
    flashcard_id: str
    rating: int = Field(ge=1, le=5)


class FlashcardReviewResponse(CamelModel):
    review_id: str
    flashcard_id: str
    rating: int
    due_at: datetime
    interval_days: int


class QuizGenerationRequest(CamelModel):
    material_id: str | None = None
    topic_id: str | None = None
    course_id: str | None = None
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    count: int = Field(default=5, ge=1, le=25)
    include_scenarios: bool = True


class QuizQuestionItem(CamelModel):
    prompt: str
    question_type: QuizQuestionType
    options: list[str] | None = None
    correct_answer: str
    explanation: str

    @field_validator("options")
    @classmethod
    def options_for_mcq(cls, value: list[str] | None, info):
        if info.data.get("question_type") == QuizQuestionType.MCQ and not value:
            raise ValueError("MCQ questions need options.")
        return value


class QuizGenerationResult(CamelModel):
    questions: list[QuizQuestionItem]


class QuizQuestionResponse(TimestampsMixin):
    quiz_set_id: str
    prompt: str
    question_type: str
    options: list[str] | None
    explanation: str
    order_index: int


class QuizSetResponse(TimestampsMixin):
    user_id: str
    course_id: str | None
    topic_id: str | None
    material_id: str | None
    title: str
    difficulty: str
    question_count: int
    metadata_json: dict
    questions: list[QuizQuestionResponse] = Field(default_factory=list)


class QuizAttemptAnswerInput(CamelModel):
    question_id: str
    submitted_answer: str


class QuizAttemptRequest(CamelModel):
    quiz_set_id: str
    duration_seconds: int | None = None
    answers: list[QuizAttemptAnswerInput] = Field(default_factory=list)


class QuizAttemptAnswerResponse(TimestampsMixin):
    quiz_question_id: str
    submitted_answer: str
    is_correct: bool
    score_awarded: float
    feedback: str | None


class QuizAttemptResponse(TimestampsMixin):
    quiz_set_id: str
    user_id: str
    score: float
    total_questions: int
    correct_count: int
    completed_at: datetime
    duration_seconds: int | None
    answers: list[QuizAttemptAnswerResponse] = Field(default_factory=list)


class CitationResponse(CamelModel):
    chunk_id: str
    source_label: str
    snippet: str
    page_number: int | None = None
    slide_number: int | None = None
    start_second: int | None = None
    end_second: int | None = None


class ChatThreadCreate(CamelModel):
    title: str
    scope_type: ChatScope
    course_id: str | None = None
    topic_id: str | None = None
    material_id: str | None = None
    strict_mode: bool = False
    answer_style: ChatAnswerStyle = ChatAnswerStyle.CONCISE


class ChatMessageCreate(CamelModel):
    content: str


class ChatMessageResponse(TimestampsMixin):
    thread_id: str
    role: str
    content: str
    metadata_json: dict
    citations: list[CitationResponse] = Field(default_factory=list)


class ChatThreadResponse(TimestampsMixin):
    user_id: str
    course_id: str | None
    topic_id: str | None
    material_id: str | None
    title: str
    scope_type: str
    strict_mode: bool
    answer_style: str
    messages: list[ChatMessageResponse] = Field(default_factory=list)


class NoteGenerationResult(CamelModel):
    summary: str
    detailed_notes: str
    concise_notes: str
    key_terms: list[str]
    exam_questions: list[str]
    teach_me: str
    revision_sheet: str


class RAGAnswerResponse(CamelModel):
    answer: str
    citations: list[CitationResponse]


class DashboardWeakTopicResponse(CamelModel):
    topic: str
    mastery: float


class DashboardRecentUploadResponse(CamelModel):
    id: str
    title: str
    status: str
    course_title: str


class DashboardResponse(CamelModel):
    streak_days: int
    due_flashcards: int
    recent_quiz_average: float
    weak_topics: list[DashboardWeakTopicResponse] = Field(default_factory=list)
    recent_uploads: list[DashboardRecentUploadResponse] = Field(default_factory=list)
    latest_notes: list[NoteSetResponse] = Field(default_factory=list)
