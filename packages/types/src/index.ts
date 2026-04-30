export type UserRole = "student" | "moderator" | "admin";
export type ProcessingStage =
  | "uploaded"
  | "extracting"
  | "transcribing"
  | "chunking"
  | "embedding"
  | "generating_notes"
  | "generating_flashcards"
  | "generating_quiz"
  | "completed"
  | "failed";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  universityName?: string | null;
  major?: string | null;
  semester?: string | null;
}

export interface CourseSummary {
  id: string;
  code: string;
  title: string;
  departmentName: string;
  topicCount: number;
  materialCount: number;
}

export interface DashboardSnapshot {
  streakDays: number;
  dueFlashcards: number;
  recentQuizAverage: number;
  weakTopics: Array<{ topic: string; mastery: number }>;
  recentUploads: Array<{
    id: string;
    title: string;
    status: ProcessingStage;
    courseTitle: string;
  }>;
}

export interface ChatCitation {
  chunkId: string;
  sourceLabel: string;
  pageNumber?: number | null;
  slideNumber?: number | null;
  startSecond?: number | null;
  endSecond?: number | null;
  snippet: string;
}

export type ChatScope = "material" | "topic" | "course" | "workspace";
export type ChatAnswerStyle = "beginner" | "concise" | "detailed" | "exam-oriented" | "bullet-summary";

export interface ChatMessageDTO {
  id: string;
  threadId: string;
  role: "user" | "assistant" | string;
  content: string;
  metadataJson?: Record<string, unknown>;
  citations: ChatCitation[];
  createdAt?: string;
}

export interface ChatThreadDTO {
  id: string;
  userId: string;
  title: string;
  scopeType: ChatScope;
  courseId?: string | null;
  topicId?: string | null;
  materialId?: string | null;
  strictMode: boolean;
  answerStyle: ChatAnswerStyle;
  messages: ChatMessageDTO[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatThreadCreateDTO {
  title: string;
  scopeType: ChatScope;
  courseId?: string | null;
  topicId?: string | null;
  materialId?: string | null;
  strictMode: boolean;
  answerStyle: ChatAnswerStyle;
}

export interface RAGAnswerDTO {
  answer: string;
  citations: ChatCitation[];
}

export interface FlashcardDTO {
  id: string;
  deckId?: string;
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  explanation?: string | null;
  orderIndex?: number;
  dueAt?: string | null;
}

export interface FlashcardDeckDTO {
  id: string;
  title: string;
  sourceScope: string;
  courseId?: string | null;
  topicId?: string | null;
  materialId?: string | null;
  metadataJson?: Record<string, unknown>;
  flashcards: FlashcardDTO[];
}

export interface FlashcardReviewDTO {
  reviewId: string;
  flashcardId: string;
  rating: number;
  dueAt: string;
  intervalDays: number;
}

export interface QuizQuestionDTO {
  id: string;
  quizSetId?: string;
  prompt: string;
  type: "mcq" | "true_false" | "short_answer" | "scenario";
  questionType?: "mcq" | "true_false" | "short_answer" | "scenario";
  options?: string[];
  explanation: string;
  orderIndex?: number;
  correctAnswer?: string;
}

export interface QuizSetDTO {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  questionCount: number;
  courseId?: string | null;
  topicId?: string | null;
  materialId?: string | null;
  metadataJson?: Record<string, unknown>;
  questions: QuizQuestionDTO[];
}

export interface QuizAttemptAnswerDTO {
  id: string;
  quizQuestionId: string;
  submittedAnswer: string;
  isCorrect: boolean;
  scoreAwarded: number;
  feedback?: string | null;
  correctAnswer?: string | null;
}

export interface QuizAttemptDTO {
  id: string;
  quizSetId: string;
  userId?: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  completedAt?: string;
  durationSeconds?: number | null;
  answers: QuizAttemptAnswerDTO[];
}

export interface QuizPerformanceOverviewDTO {
  averageScore: number;
  weakTopics: Array<{ topicId: string; topic?: string; masteryScore: number; reason?: string | null }>;
}
