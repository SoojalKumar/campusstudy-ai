import type { CourseSummary, DashboardSnapshot, FlashcardDTO, QuizQuestionDTO } from "@campusstudy/types";

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
    front: "When is BFS preferable to DFS?",
    back: "When the shortest path in an unweighted graph matters.",
    difficulty: "medium",
    tags: ["graphs", "algorithms"]
  },
  {
    id: "f2",
    front: "What does overfitting mean?",
    back: "A model memorises training data and performs poorly on unseen data.",
    difficulty: "easy",
    tags: ["ml", "exam"]
  }
];

export const demoQuiz: QuizQuestionDTO[] = [
  {
    id: "q1",
    prompt: "Which structure powers BFS?",
    type: "mcq",
    options: ["Stack", "Queue", "Heap", "Set"],
    explanation: "BFS expands level by level, which matches queue behavior."
  },
  {
    id: "q2",
    prompt: "True or false: recall practice is stronger than passive rereading.",
    type: "true_false",
    options: ["True", "False"],
    explanation: "Retrieval practice usually improves long-term retention."
  }
];

