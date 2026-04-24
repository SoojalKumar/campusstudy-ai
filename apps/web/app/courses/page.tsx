"use client";

import Link from "next/link";
import { EmptyState, SectionCard } from "@campusstudy/ui";

import { LayoutShell } from "@/components/layout-shell";
import { demoCourses } from "@/lib/demo-data";
import { useAuthedQuery } from "@/lib/api-hooks";

export default function CoursesPage() {
  const coursesQuery = useAuthedQuery({
    queryKey: ["courses"],
    path: "/courses",
    fallbackData: demoCourses
  });
  const courses = coursesQuery.data;

  return (
    <LayoutShell>
      <div className="grid gap-6">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Courses</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Organize work by semester, course, and topic.</h1>
          {!coursesQuery.hasSession && coursesQuery.hydrated ? (
            <p className="mt-4 text-sm text-gold">Showing seeded course previews until you sign in.</p>
          ) : null}
        </section>
        <SectionCard title="Enrolled Courses" eyebrow="Pilot Data">
          {courses.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((course) => (
                <Link
                  href={`/courses/${course.id}`}
                  key={course.id}
                  className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5"
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{course.code}</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{course.title}</h2>
                  <p className="mt-3 text-sm text-slate-300">{course.departmentName}</p>
                  <div className="mt-4 flex gap-3 text-sm text-slate-400">
                    <span>{course.topicCount} topics</span>
                    <span>{course.materialCount} materials</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No courses yet"
              description="Join a course or ask an admin to seed the semester offering."
            />
          )}
        </SectionCard>
      </div>
    </LayoutShell>
  );
}
