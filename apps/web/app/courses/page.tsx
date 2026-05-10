"use client";

import Link from "next/link";
import { EmptyState, SectionCard } from "@campusstudy/ui";
import type { CourseSummary } from "@campusstudy/types";

import { LayoutShell } from "@/components/layout-shell";
import { useAuthedQuery } from "@/lib/api-hooks";

export default function CoursesPage() {
  const coursesQuery = useAuthedQuery<CourseSummary[]>({
    queryKey: ["courses"],
    path: "/courses"
  });
  const courses = coursesQuery.data ?? [];

  return (
    <LayoutShell>
      <div className="grid gap-6">
        <section className="cs-card p-6 md:p-8">
          <p className="cs-eyebrow text-gold">Courses</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-ink">
            Organize work by semester, course, and topic.
          </h1>
          {!coursesQuery.hasSession && coursesQuery.hydrated ? (
            <p className="mt-4 text-sm text-gold">Sign in to see your enrolled courses and course materials.</p>
          ) : null}
        </section>
        <SectionCard title="Enrolled Courses" eyebrow="Workspace">
          {courses.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((course) => (
                <Link
                  href={`/courses/${course.id}`}
                  key={course.id}
                  className="rounded-[1.75rem] border border-[var(--line)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-tide/30 hover:shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{course.code}</p>
                  <h2 className="mt-2 text-xl font-semibold text-ink">{course.title}</h2>
                  <p className="mt-3 text-sm text-slate-600">{course.departmentName}</p>
                  <div className="mt-4 flex gap-3 text-sm text-slate-500">
                    <span>{course.topicCount} topics</span>
                    <span>{course.materialCount} materials</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No courses yet"
              description="Join a course or ask an admin to add the semester offering."
            />
          )}
        </SectionCard>
      </div>
    </LayoutShell>
  );
}
