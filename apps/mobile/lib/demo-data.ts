import type {
  CourseSummary,
  DashboardSnapshot,
  FlashcardDeckDTO,
  ProcessingStage,
  QuizSetDTO
} from "@campusstudy/types";

export type MobileDashboardSnapshot = DashboardSnapshot & {
  latestNotes: Array<{ id: string; title: string; noteType: string; contentMarkdown?: string }>;
};

export const mobileDashboard: MobileDashboardSnapshot = {
  dueFlashcards: 18,
  latestNotes: [
    {
      id: "n1",
      title: "Graph Traversal Summary",
      noteType: "summary",
      contentMarkdown: "Queue behavior, traversal order, and shortest-path guarantees."
    },
    {
      id: "n2",
      title: "Supervised Learning Revision Sheet",
      noteType: "revision_sheet",
      contentMarkdown: "Model fit, validation splits, and bias-variance warning signs."
    }
  ],
  recentQuizAverage: 0.78,
  recentUploads: [
    { id: "m1", title: "Week 4 Graphs Lecture", status: "completed", courseTitle: "CS220" },
    { id: "m2", title: "Supervised Learning Audio", status: "completed", courseTitle: "CS340" }
  ],
  streakDays: 5,
  weakTopics: [
    { topic: "Graph tracing", mastery: 0.62 },
    { topic: "Bias-variance", mastery: 0.69 },
    { topic: "Cell transport", mastery: 0.72 }
  ]
};

export const mobileCourses = [
  {
    id: "c1",
    code: "CS220",
    title: "Data Structures for Study Systems",
    departmentName: "Computer Science",
    topicCount: 8,
    materialCount: 12
  },
  {
    id: "c2",
    code: "CS340",
    title: "Machine Learning in Education",
    departmentName: "Computer Science",
    topicCount: 7,
    materialCount: 9
  }
] satisfies CourseSummary[];

const demoDataStructuresCourse = mobileCourses[0]!;
const demoMachineLearningCourse = mobileCourses[1]!;

export type MobileTopic = {
  id: string;
  title: string;
  description?: string | null;
};

export type MobileCourseDetail = CourseSummary & {
  description?: string | null;
  term?: string;
  year?: number;
  topics: MobileTopic[];
};

export type MobileMaterial = {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  sourceKind: "document" | "audio" | "video";
  processingStage: ProcessingStage;
  processingStatus: "pending" | "running" | "completed" | "failed";
  extractedText?: string | null;
  transcriptText?: string | null;
};

export type MobileNote = {
  id: string;
  title: string;
  noteType: string;
  contentMarkdown: string;
};

export const mobileCourseDetails: Record<string, MobileCourseDetail> = {
  c1: {
    ...demoDataStructuresCourse,
    description: "Traversal, trees, hashing, and exam-style algorithm tracing.",
    term: "Fall",
    year: 2026,
    topics: [
      { id: "t1", title: "Graph traversal", description: "BFS, DFS, queues, stacks, and tracing order." },
      { id: "t2", title: "Trees and heaps", description: "Shape properties, insert/delete, and complexity." },
      { id: "t3", title: "Hash tables", description: "Collision handling, load factor, and amortized lookup." }
    ]
  },
  c2: {
    ...demoMachineLearningCourse,
    description: "Model evaluation, supervised learning, and study-friendly ML examples.",
    term: "Fall",
    year: 2026,
    topics: [
      { id: "t4", title: "Bias-variance", description: "Underfit, overfit, and validation signals." },
      { id: "t5", title: "Model evaluation", description: "Precision, recall, F1, and confusion matrices." },
      { id: "t6", title: "Neural networks", description: "Layers, activation functions, and gradients." }
    ]
  }
};

export const mobileMaterialsByCourse: Record<string, MobileMaterial[]> = {
  c1: [
    {
      id: "m1",
      title: "Week 4 Graphs Lecture",
      fileName: "week-4-graphs.pdf",
      fileType: "pdf",
      sourceKind: "document",
      processingStage: "completed",
      processingStatus: "completed",
      extractedText: "BFS uses a queue to explore graph levels before DFS-style deep paths."
    },
    {
      id: "m3",
      title: "Traversal Workshop Recording",
      fileName: "traversal-workshop.mp4",
      fileType: "mp4",
      sourceKind: "video",
      processingStage: "completed",
      processingStatus: "completed",
      transcriptText: "00:46 Trace the queue state before marking visited nodes."
    }
  ],
  c2: [
    {
      id: "m2",
      title: "Supervised Learning Audio",
      fileName: "supervised-learning.m4a",
      fileType: "m4a",
      sourceKind: "audio",
      processingStage: "completed",
      processingStatus: "completed",
      transcriptText: "Bias and variance trade off when model complexity changes."
    }
  ]
};

export const mobileNotesByCourse: Record<string, MobileNote[]> = {
  c1: [
    {
      id: "n1",
      title: "Graph Traversal Summary",
      noteType: "summary",
      contentMarkdown: "BFS is best for unweighted shortest paths; DFS is best for exhaustive path exploration."
    },
    {
      id: "n3",
      title: "Likely Exam Questions",
      noteType: "exam_questions",
      contentMarkdown: "Trace BFS and DFS on the same graph and explain queue vs stack behavior."
    }
  ],
  c2: [
    {
      id: "n2",
      title: "Supervised Learning Revision Sheet",
      noteType: "revision_sheet",
      contentMarkdown: "Watch for overfitting when training score rises while validation score falls."
    }
  ]
};

export const mobileFlashcardDeck: FlashcardDeckDTO = {
  id: "demo",
  title: "Graph Traversal Review Sprint",
  sourceScope: "course",
  courseId: "c1",
  topicId: "t1",
  materialId: "m1",
  metadataJson: { cardCount: 3, readiness: 0.68 },
  flashcards: [
    {
      id: "f1",
      deckId: "demo",
      front: "When is BFS preferable to DFS?",
      back: "When the shortest path in an unweighted graph matters.",
      difficulty: "medium",
      tags: ["graphs", "algorithms"],
      explanation: "BFS explores by layers, so the first discovered route is shortest for unweighted graphs.",
      orderIndex: 0,
      dueAt: "2026-01-10T08:00:00.000Z"
    },
    {
      id: "f2",
      deckId: "demo",
      front: "What does overfitting mean?",
      back: "The model memorizes training patterns and performs poorly on new examples.",
      difficulty: "easy",
      tags: ["ml", "exam"],
      explanation: "Validation performance is the clue: training improves while generalization falls.",
      orderIndex: 1,
      dueAt: "2026-01-11T08:00:00.000Z"
    },
    {
      id: "f3",
      deckId: "demo",
      front: "What should you track while tracing DFS on an exam?",
      back: "Track the call stack, visited set, and the exact neighbor order in the prompt.",
      difficulty: "hard",
      tags: ["graphs", "exam"],
      explanation: "DFS answers often change if the neighbor order changes.",
      orderIndex: 2,
      dueAt: "2026-01-12T08:00:00.000Z"
    }
  ]
};

export const mobileQuizSet: QuizSetDTO = {
  id: "demo",
  title: "Graph Traversal Exam Sprint",
  difficulty: "medium",
  questionCount: 3,
  courseId: "c1",
  topicId: "t1",
  materialId: "m1",
  metadataJson: { estimatedMinutes: 4, source: "Week 4 Graphs Lecture" },
  questions: [
    {
      id: "q1",
      quizSetId: "demo",
      prompt: "Which structure powers breadth-first search?",
      type: "mcq",
      questionType: "mcq",
      options: ["Stack", "Queue", "Heap", "Set"],
      explanation: "BFS expands level by level, which matches first-in-first-out queue behavior.",
      orderIndex: 0,
      correctAnswer: "Queue"
    },
    {
      id: "q2",
      quizSetId: "demo",
      prompt: "True or false: DFS always finds shortest paths in unweighted graphs.",
      type: "true_false",
      questionType: "true_false",
      options: ["True", "False"],
      explanation: "DFS can travel deeply before checking nearby alternatives, so shortest paths are not guaranteed.",
      orderIndex: 1,
      correctAnswer: "False"
    },
    {
      id: "q3",
      quizSetId: "demo",
      prompt: "A professor asks you to trace BFS. What state should you update first?",
      type: "scenario",
      questionType: "scenario",
      options: ["The call stack", "The queue", "The heap invariant", "The regression line"],
      explanation: "BFS tracing depends on queue order, visited state, and neighbor order.",
      orderIndex: 2,
      correctAnswer: "The queue"
    }
  ]
};
