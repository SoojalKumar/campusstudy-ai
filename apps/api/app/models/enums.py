from enum import StrEnum


class UserRole(StrEnum):
    STUDENT = "student"
    MODERATOR = "moderator"
    ADMIN = "admin"


class ProcessingStage(StrEnum):
    UPLOADED = "uploaded"
    EXTRACTING = "extracting"
    TRANSCRIBING = "transcribing"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    GENERATING_NOTES = "generating_notes"
    GENERATING_FLASHCARDS = "generating_flashcards"
    GENERATING_QUIZ = "generating_quiz"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class MaterialKind(StrEnum):
    DOCUMENT = "document"
    AUDIO = "audio"
    VIDEO = "video"


class NoteType(StrEnum):
    SUMMARY = "summary"
    DETAILED = "detailed"
    CONCISE = "concise"
    GLOSSARY = "glossary"
    EXAM_QUESTIONS = "exam_questions"
    TEACH_ME = "teach_me"
    REVISION_SHEET = "revision_sheet"


class QuizQuestionType(StrEnum):
    MCQ = "mcq"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    SCENARIO = "scenario"


class ChatScope(StrEnum):
    MATERIAL = "material"
    TOPIC = "topic"
    COURSE = "course"
    WORKSPACE = "workspace"


class ChatAnswerStyle(StrEnum):
    BEGINNER = "beginner"
    CONCISE = "concise"
    DETAILED = "detailed"
    EXAM = "exam-oriented"
    BULLET = "bullet-summary"

