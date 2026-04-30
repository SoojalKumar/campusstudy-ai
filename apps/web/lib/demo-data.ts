import type {
  CourseSummary,
  DashboardSnapshot,
  FlashcardDTO,
  FlashcardDeckDTO,
  QuizPerformanceOverviewDTO,
  QuizQuestionDTO,
  QuizSetDTO
} from "@campusstudy/types";

export const demoDashboard: DashboardSnapshot = {
  streakDays: 5,
  dueFlashcards: 18,
  recentQuizAverage: 0.78,
  weakTopics: [
    { topic: "Graph traversal", mastery: 0.62 },
    { topic: "Bias-variance trade-off", mastery: 0.69 },
    { topic: "Cell membrane transport", mastery: 0.71 }
  ],
  recentUploads: [
    { id: "m1", title: "Week 4 Graphs Lecture", status: "completed", courseTitle: "CS220" },
    { id: "m2", title: "Supervised Learning Audio", status: "completed", courseTitle: "CS340" }
  ]
};

export const demoCourses: CourseSummary[] = [
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
];

export const demoFlashcards: FlashcardDTO[] = [
  {
    id: "f1",
    deckId: "demo",
    front: "When is BFS preferable to DFS?",
    back: "When the shortest path in an unweighted graph matters.",
    difficulty: "medium",
    tags: ["graphs", "algorithms"],
    explanation: "BFS expands level by level, so the first time it reaches a node is the shortest unweighted path.",
    orderIndex: 0,
    dueAt: "2026-01-10T08:00:00.000Z"
  },
  {
    id: "f2",
    deckId: "demo",
    front: "What does overfitting mean?",
    back: "A model memorises training data and performs poorly on unseen data.",
    difficulty: "easy",
    tags: ["ml", "exam"],
    explanation: "The warning sign is a high training score paired with weak validation performance.",
    orderIndex: 1,
    dueAt: "2026-01-11T08:00:00.000Z"
  },
  {
    id: "f3",
    deckId: "demo",
    front: "What should you track while tracing DFS on an exam?",
    back: "Track the call stack, visited set, and the exact neighbor order used by the prompt.",
    difficulty: "hard",
    tags: ["graphs", "exam"],
    explanation: "Most mistakes come from changing neighbor order or forgetting when a node becomes visited.",
    orderIndex: 2,
    dueAt: "2026-01-12T08:00:00.000Z"
  }
];

export const demoFlashcardDeck: FlashcardDeckDTO = {
  id: "demo",
  title: "Graph Traversal Review Sprint",
  sourceScope: "course",
  courseId: "c1",
  topicId: "t1",
  materialId: "m1",
  metadataJson: { cardCount: demoFlashcards.length, readiness: 0.68 },
  flashcards: demoFlashcards
};

export const demoQuiz: QuizQuestionDTO[] = [
  {
    id: "q1",
    quizSetId: "demo",
    prompt: "Which structure powers BFS?",
    type: "mcq",
    questionType: "mcq",
    options: ["Stack", "Queue", "Heap", "Set"],
    explanation: "BFS expands level by level, which matches queue behavior.",
    correctAnswer: "Queue",
    orderIndex: 0
  },
  {
    id: "q2",
    quizSetId: "demo",
    prompt: "True or false: recall practice is stronger than passive rereading.",
    type: "true_false",
    questionType: "true_false",
    options: ["True", "False"],
    explanation: "Retrieval practice usually improves long-term retention.",
    correctAnswer: "True",
    orderIndex: 1
  },
  {
    id: "q3",
    quizSetId: "demo",
    prompt: "A lecture asks for the shortest path in an unweighted graph. Which traversal should you reach for first?",
    type: "scenario",
    questionType: "scenario",
    options: ["DFS with recursion", "BFS with a queue", "Heap sort", "Binary search"],
    explanation: "BFS discovers nodes by distance layer, so it is the default for shortest unweighted paths.",
    correctAnswer: "BFS with a queue",
    orderIndex: 2
  }
];

export const demoQuizSet: QuizSetDTO = {
  id: "demo",
  title: "Graph Traversal Exam Sprint",
  difficulty: "medium",
  questionCount: demoQuiz.length,
  courseId: "c1",
  topicId: "t1",
  materialId: "m1",
  metadataJson: { mode: "exam", estimatedMinutes: 6 },
  questions: demoQuiz
};

export const demoQuizPerformance: QuizPerformanceOverviewDTO = {
  averageScore: 0.78,
  weakTopics: [
    {
      topicId: "t1",
      topic: "Graph traversal",
      masteryScore: 0.64,
      reason: "Missed queue-vs-stack questions in recent attempts."
    },
    {
      topicId: "t2",
      topic: "Model evaluation",
      masteryScore: 0.73,
      reason: "Needs more practice explaining validation metrics."
    },
    {
      topicId: "t3",
      topic: "Study strategy",
      masteryScore: 0.82,
      reason: "Mostly stable, but explanations can be sharper."
    }
  ]
};
