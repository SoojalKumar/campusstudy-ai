"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { LayoutShell } from "@/components/layout-shell";
import { useAuthedQuery } from "@/lib/api-hooks";

type CourseDetail = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  topics: Array<{ id: string; title: string; description?: string | null }>;
};

type MaterialSummary = {
  id: string;
  title: string;
  processingStage: string;
  fileType: string;
};

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;
  const courseQuery = useAuthedQuery<CourseDetail>({
    queryKey: ["course", courseId],
    path: `/courses/${courseId}`,
    fallbackData: {
      id: courseId,
      code: "COURSE",
      title: `Course ${courseId}`,
      description: "Live course data appears here after sign-in.",
      topics: []
    }
  });
  const materialsQuery = useAuthedQuery<MaterialSummary[]>({
    queryKey: ["materials", courseId],
    path: `/materials?course_id=${courseId}`,
    fallbackData: []
  });
  const course = courseQuery.data;

  return (
    <LayoutShell>
      <div className="grid gap-6">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-tide">Course Workspace</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">
            {course.code} · {course.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            {course.description ??
              "Topic folders, generated note packs, transcript-driven revision, and material-level chat all roll up here."}
          </p>
        </section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <h2 className="text-xl font-semibold text-white">Topic folders</h2>
            <div className="mt-4 space-y-3">
              {course.topics.length ? (
                course.topics.map((topic) => (
                  <div key={topic.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="font-medium text-white">{topic.title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {topic.description ?? "Notes, flashcards, quizzes, transcript clips"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-400">
                  Sign in to load live topics for this course.
                </div>
              )}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <h2 className="text-xl font-semibold text-white">Course materials</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              {materialsQuery.data.length ? (
                materialsQuery.data.map((material) => (
                  <Link
                    key={material.id}
                    href={`/materials/${material.id}`}
                    className="block rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                  >
                    <p className="font-medium text-white">{material.title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {material.fileType.toUpperCase()} · {material.processingStage}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-slate-400">
                  No live materials yet. Upload a lecture file from the dashboard.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
