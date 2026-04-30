"use client";

import type {
  ChatAnswerStyle,
  ChatScope,
  ChatThreadCreateDTO,
  ChatThreadDTO,
  CourseSummary,
  RAGAnswerDTO
} from "@campusstudy/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { LayoutShell } from "@/components/layout-shell";
import { SourceCitationCard } from "@/components/source-citation-card";
import { apiFetch } from "@/lib/api";
import { useAuthedQuery } from "@/lib/api-hooks";
import { demoChatThread, demoCourses } from "@/lib/demo-data";
import { useSession } from "@/lib/session";

type MaterialSummary = {
  id: string;
  title: string;
  fileName: string;
  courseId: string;
  processingStatus: string;
};

const answerStyles: ChatAnswerStyle[] = [
  "exam-oriented",
  "concise",
  "detailed",
  "beginner",
  "bullet-summary"
];

export default function ChatThreadPage() {
  const params = useParams<{ threadId?: string }>();
  const threadId = params.threadId ?? "demo";
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const [message, setMessage] = useState("How would this show up on an exam?");
  const [scopeType, setScopeType] = useState<ChatScope>("workspace");
  const [answerStyle, setAnswerStyle] = useState<ChatAnswerStyle>("exam-oriented");
  const [strictMode, setStrictMode] = useState(true);

  const threadQuery = useAuthedQuery<ChatThreadDTO>({
    queryKey: ["chat-thread", threadId],
    path: `/chat/threads/${threadId}`,
    fallbackData: demoChatThread,
    enabled: threadId !== "demo"
  });
  const threadListQuery = useAuthedQuery<ChatThreadDTO[]>({
    queryKey: ["chat-threads"],
    path: "/chat/threads",
    fallbackData: []
  });
  const coursesQuery = useAuthedQuery<CourseSummary[]>({
    queryKey: ["courses"],
    path: "/courses",
    fallbackData: demoCourses
  });
  const materialsQuery = useAuthedQuery<MaterialSummary[]>({
    queryKey: ["materials"],
    path: "/materials",
    fallbackData: []
  });
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const thread = threadQuery.data;
  const latestAssistant = [...thread.messages].reverse().find((item) => item.role === "assistant");
  const citations = latestAssistant?.citations ?? [];
  const canSend = Boolean(token) && threadId !== "demo" && message.trim().length > 0;

  const createThreadMutation = useMutation({
    mutationFn: () => {
      const payload: ChatThreadCreateDTO = {
        answerStyle,
        strictMode,
        scopeType,
        title:
          scopeType === "material"
            ? "Material source chat"
            : scopeType === "course"
              ? "Course source chat"
              : "Workspace source chat"
      };
      if (scopeType === "course") payload.courseId = selectedCourseId;
      if (scopeType === "material") payload.materialId = selectedMaterialId;
      return apiFetch<ChatThreadDTO>("/chat/threads", {
        body: JSON.stringify(payload),
        method: "POST",
        token
      });
    },
    onSuccess: (createdThread) => {
      void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      router.push(`/chat/${createdThread.id}`);
    }
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      apiFetch<RAGAnswerDTO>(`/chat/threads/${threadId}/messages`, {
        body: JSON.stringify({ content: message }),
        method: "POST",
        token
      }),
    onSuccess: () => {
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["chat-thread", threadId] });
      void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    }
  });

  const startDisabled =
    !token ||
    createThreadMutation.isPending ||
    (scopeType === "material" && !selectedMaterialId) ||
    (scopeType === "course" && !selectedCourseId);

  return (
    <LayoutShell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-tide">RAG Chat</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold text-white">{thread.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Ask questions over uploaded course material with citations, strict-source mode, and exam-ready answer
                styles.
              </p>
            </div>
            <span className="rounded-full border border-gold/20 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold">
              {thread.strictMode ? "Strict sources" : "Flexible"}
            </span>
          </div>

          {!threadQuery.hasSession && threadQuery.hydrated ? (
            <p className="mt-5 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
              Static demo chat is showing. Use seeded login to create a real thread and persist messages.
            </p>
          ) : null}

          {threadId === "demo" ? (
            <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold">
                    Start Real Chat
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Create a live RAG thread.</h2>
                </div>
                <button
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-tide disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={startDisabled}
                  onClick={() => createThreadMutation.mutate()}
                  type="button"
                >
                  {createThreadMutation.isPending ? "Creating..." : "Start live thread"}
                </button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-300">
                  Source scope
                  <select
                    className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white"
                    onChange={(event) => setScopeType(event.target.value as ChatScope)}
                    value={scopeType}
                  >
                    <option value="workspace">Whole workspace</option>
                    <option value="course">Selected course</option>
                    <option value="material">Selected material</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  Answer style
                  <select
                    className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white"
                    onChange={(event) => setAnswerStyle(event.target.value as ChatAnswerStyle)}
                    value={answerStyle}
                  >
                    {answerStyles.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </label>
                {scopeType === "course" ? (
                  <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                    Course
                    <select
                      className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white"
                      onChange={(event) => setSelectedCourseId(event.target.value)}
                      value={selectedCourseId}
                    >
                      <option value="">Choose a course</option>
                      {coursesQuery.data.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.code} - {course.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {scopeType === "material" ? (
                  <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                    Material
                    <select
                      className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white"
                      onChange={(event) => setSelectedMaterialId(event.target.value)}
                      value={selectedMaterialId}
                    >
                      <option value="">Choose an uploaded material</option>
                      {materialsQuery.data.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.title} - {material.processingStatus}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
              <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
                <input
                  checked={strictMode}
                  className="size-4 accent-cyan-300"
                  onChange={(event) => setStrictMode(event.target.checked)}
                  type="checkbox"
                />
                Strictly answer from retrieved source chunks.
              </label>
              {createThreadMutation.isError ? (
                <p className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {(createThreadMutation.error as Error).message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            {thread.messages.length ? (
              thread.messages.map((chatMessage) => (
                <div
                  className={
                    chatMessage.role === "assistant"
                      ? "rounded-3xl border border-tide/30 bg-tide/10 p-5"
                      : "rounded-3xl bg-slate-950/80 p-5"
                  }
                  key={chatMessage.id}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    {chatMessage.role === "assistant" ? "CampusStudy AI" : "You"}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white">{chatMessage.content}</p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
                This thread is ready. Ask a question and citations will appear beside the answer.
              </div>
            )}
          </div>

          <form
            className="mt-5 rounded-[2rem] border border-white/10 bg-slate-950/60 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSend) sendMutation.mutate();
            }}
          >
            <textarea
              className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-tide/50"
              disabled={!token || threadId === "demo"}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about exam traps, lecture concepts, or confusing passages..."
              value={message}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                {threadId === "demo" ? "Start a live thread before sending." : `${thread.answerStyle} mode`}
              </p>
              <button
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-tide disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSend || sendMutation.isPending}
                type="submit"
              >
                {sendMutation.isPending ? "Asking..." : "Ask with sources"}
              </button>
            </div>
            {sendMutation.isError ? (
              <p className="mt-3 text-sm text-rose-200">{(sendMutation.error as Error).message}</p>
            ) : null}
          </form>
        </section>

        <aside className="grid gap-6">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-ember">Recent Threads</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Live conversations</h2>
            <div className="mt-4 space-y-3">
              {threadListQuery.data.length ? (
                threadListQuery.data.map((item) => (
                  <Link
                    className="block rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-tide/30"
                    href={`/chat/${item.id}`}
                    key={item.id}
                  >
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.scopeType} - {item.answerStyle}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-400">
                  No live threads yet.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            {citations.length ? (
              citations.map((citation) => <SourceCitationCard key={citation.chunkId} citation={citation} />)
            ) : (
              <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5 text-sm text-slate-400">
                Citations show up after the assistant retrieves chunks from your uploaded material.
              </div>
            )}
          </div>
        </aside>
      </div>
    </LayoutShell>
  );
}
