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

export interface FlashcardDTO {
  id: string;
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  dueAt?: string | null;
}

export interface QuizQuestionDTO {
  id: string;
  prompt: string;
  type: "mcq" | "true_false" | "short_answer" | "scenario";
  options?: string[];
  explanation: string;
}

