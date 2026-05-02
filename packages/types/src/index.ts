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

export interface NoteSetDTO {
  id: string;
  userId: string;
  courseId?: string | null;
  topicId?: string | null;
  materialId?: string | null;
  noteType: string;
  title: string;
  contentMarkdown: string;
  metadataJson?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface NoteSectionBlock {
  kind: "paragraph" | "bullet" | "numbered";
  text: string;
}

export interface NoteSection {
  title?: string;
  blocks: NoteSectionBlock[];
}

export function formatNoteTypeLabel(noteType: string) {
  return noteType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildNoteSections(contentMarkdown: string): NoteSection[] {
  const sections: NoteSection[] = [];
  let currentSection: NoteSection = { blocks: [] };
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    currentSection.blocks.push({
      kind: "paragraph",
      text: paragraphBuffer.join(" ").trim()
    });
    paragraphBuffer = [];
  };

  const flushSection = () => {
    flushParagraph();
    if (!currentSection.title && !currentSection.blocks.length) return;
    sections.push(currentSection);
    currentSection = { blocks: [] };
  };

  for (const rawLine of contentMarkdown.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    if (line.startsWith("#")) {
      flushSection();
      currentSection.title = line.replace(/^#+\s*/, "").trim();
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      currentSection.blocks.push({ kind: "bullet", text: (bulletMatch[1] ?? "").trim() });
      continue;
    }

    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      flushParagraph();
      currentSection.blocks.push({ kind: "numbered", text: (numberedMatch[1] ?? "").trim() });
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushSection();
  return sections.length ? sections : [{ title: "Overview", blocks: [{ kind: "paragraph", text: contentMarkdown.trim() }] }];
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

export function formatTimestampSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatCitationLocation(
  citation: Pick<ChatCitation, "pageNumber" | "slideNumber" | "startSecond" | "endSecond">
) {
  if (citation.pageNumber) return `Page ${citation.pageNumber}`;
  if (citation.slideNumber) return `Slide ${citation.slideNumber}`;
  if (citation.startSecond != null) {
    const start = formatTimestampSeconds(citation.startSecond);
    const end = formatTimestampSeconds(citation.endSecond ?? citation.startSecond);
    return `${start}-${end}`;
  }
  return "Source";
}

export function normalizeCitationSnippet(snippet: string) {
  return snippet.replace(/\s+/g, " ").trim();
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
