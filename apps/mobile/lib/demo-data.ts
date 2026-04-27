import type { DashboardSnapshot } from "@campusstudy/types";

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
  { id: "c1", code: "CS220", title: "Data Structures for Study Systems" },
  { id: "c2", code: "CS340", title: "Machine Learning in Education" }
];
