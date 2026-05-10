"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type { CourseSummary } from "@campusstudy/types";

import { apiErrorMessage, apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";
import { UploadDropzone } from "@/components/upload-dropzone";

type MaterialUploadPanelProps = {
  courses: CourseSummary[];
};

export function MaterialUploadPanel({ courses }: MaterialUploadPanelProps) {
  const queryClient = useQueryClient();
  const { token } = useSession();
  const hasSession = Boolean(token);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);

  const courseOptions = useMemo(() => courses, [courses]);

  useEffect(() => {
    if (!courseId && courseOptions[0]?.id) {
      setCourseId(courseOptions[0].id);
    }
  }, [courseId, courseOptions]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Sign in to upload study materials.");
      if (!file) throw new Error("Choose a file to upload.");
      const formData = new FormData();
      formData.append("course_id", courseId);
      formData.append("title", title || file.name);
      formData.append("file", file);
      return apiFetch("/materials/upload", {
        method: "POST",
        token,
        body: formData
      });
    },
    onSuccess: async () => {
      setTitle("");
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["materials"] });
    }
  });

  return (
    <div className="space-y-4">
      <UploadDropzone selectedLabel={file?.name} onSelect={setFile} />
      <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="cs-input px-4 py-3"
          placeholder="Material title"
        />
        <select
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
          className="cs-input px-4 py-3"
        >
          {courseOptions.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} · {course.title}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm leading-6 text-slate-600">
          {hasSession
            ? "Upload starts the full extraction, chunking, embedding, and study asset pipeline."
            : "Sign in first to upload materials into the processing pipeline."}
        </p>
        <button
          type="button"
          onClick={() => uploadMutation.mutate()}
          disabled={!hasSession || !courseId || uploadMutation.isPending}
          className="cs-button-primary px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploadMutation.isPending ? "Uploading..." : "Start Processing"}
        </button>
      </div>
      {uploadMutation.error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {apiErrorMessage(uploadMutation.error)}
        </p>
      ) : null}
      {uploadMutation.isSuccess ? (
        <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Upload queued successfully. Refresh or open the material later.
        </p>
      ) : null}
    </div>
  );
}
