"use client";

import type { FlashcardDTO, FlashcardDeckDTO, FlashcardReviewDTO } from "@campusstudy/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

import { LayoutShell } from "@/components/layout-shell";
import { apiFetch } from "@/lib/api";
import { useAuthedQuery } from "@/lib/api-hooks";
import { useSession } from "@/lib/session";

const reviewActions = [
  { label: "Again", rating: 1, helper: "Back tomorrow", className: "border-rose-300/20 bg-rose-400/10 text-rose-100" },
  { label: "Hard", rating: 2, helper: "Short spacing", className: "border-ember/25 bg-ember/10 text-orange-100" },
  { label: "Good", rating: 4, helper: "Extend spacing", className: "border-tide/25 bg-tide/10 text-cyan-100" },
  { label: "Easy", rating: 5, helper: "Long spacing", className: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" }
] as const;

function isDue(card: FlashcardDTO) {
  if (!card.dueAt) return true;
  const dueAt = Date.parse(card.dueAt);
  return Number.isNaN(dueAt) || dueAt <= Date.now();
}

function formatDue(dueAt?: string | null) {
  if (!dueAt) return "Due now";
  const parsed = Date.parse(dueAt);
  if (Number.isNaN(parsed)) return "Due now";
  const deltaDays = Math.ceil((parsed - Date.now()) / 86_400_000);
  if (deltaDays <= 0) return "Due now";
  if (deltaDays === 1) return "Due tomorrow";
  return `Due in ${deltaDays} days`;
}

export default function FlashcardDeckPage() {
  const params = useParams<{ deckId: string }>();
  const deckId = params.deckId;
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => new Set());

  const deckQuery = useAuthedQuery<FlashcardDeckDTO>({
    queryKey: ["flashcard-deck", deckId],
    path: `/flashcards/decks/${deckId}`
  });

  const reviewMutation = useMutation({
    mutationFn: ({ flashcardId, rating }: { flashcardId: string; rating: number }) =>
      apiFetch<FlashcardReviewDTO>(`/flashcards/decks/${deckId}/review`, {
        body: JSON.stringify({ flashcardId, rating }),
        method: "POST",
        token
      }),
    onSuccess: (_payload, variables) => {
      setReviewedIds((current) => {
        const next = new Set(current);
        next.add(variables.flashcardId);
        return next;
      });
      setActiveIndex(0);
      setRevealed(false);
      void queryClient.invalidateQueries({ queryKey: ["flashcard-deck", deckId] });
    }
  });

  const deck = deckQuery.data;
  const dueCards = deck?.flashcards.filter((card) => isDue(card) && !reviewedIds.has(card.id)) ?? [];
  const activeCard = dueCards[activeIndex] ?? dueCards[0];
  const completedCount = deck ? deck.flashcards.length - dueCards.length : 0;
  const progress = deck?.flashcards.length ? Math.round((completedCount / deck.flashcards.length) * 100) : 0;

  const reviewCard = (card: FlashcardDTO, rating: number) => {
    reviewMutation.mutate({ flashcardId: card.id, rating });
  };

  if (!deck && deckQuery.hydrated) {
    return (
      <LayoutShell>
        <div className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Spaced Repetition</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            {deckQuery.hasSession ? "Deck not found" : "Sign in to review flashcards"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Flashcard decks are generated from your uploaded materials and synced to your account.
          </p>
        </div>
      </LayoutShell>
    );
  }

  if (!deck) {
    return (
      <LayoutShell>
        <div className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-8 text-sm text-slate-300">
          Loading flashcards...
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-gold">Spaced Repetition</p>
              <h1 className="mt-3 max-w-2xl text-3xl font-semibold text-white">{deck.title}</h1>
            </div>
            <div className="rounded-full border border-tide/20 bg-tide/10 px-4 py-2 text-sm font-semibold text-tide">
              {dueCards.length} due
            </div>
          </div>

          {deckQuery.isError ? (
            <p className="mt-4 rounded-2xl border border-ember/20 bg-ember/10 px-4 py-3 text-sm text-orange-100">
              This deck could not load. Refresh or open a deck from your dashboard.
            </p>
          ) : null}

          <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Review progress</p>
              <p className="text-sm font-semibold text-white">
                {completedCount}/{deck.flashcards.length}
              </p>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-tide transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {activeCard ? (
            <div className="mt-6">
              <button
                className="group min-h-[360px] w-full rounded-[2.5rem] border border-tide/20 bg-gradient-to-br from-tide/20 via-slate-950/70 to-slate-950 p-8 text-left shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-tide/40"
                onClick={() => setRevealed((value) => !value)}
                type="button"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gold">
                    {revealed ? "Back" : "Front"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                    {formatDue(activeCard.dueAt)}
                  </span>
                </div>
                <p className="mt-14 text-3xl font-semibold leading-tight text-white md:text-4xl">
                  {revealed ? activeCard.back : activeCard.front}
                </p>
                {revealed && activeCard.explanation ? (
                  <p className="mt-6 max-w-2xl text-sm leading-6 text-slate-300">{activeCard.explanation}</p>
                ) : null}
                <div className="mt-10 flex flex-wrap gap-2">
                  {activeCard.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>

              {!revealed ? (
                <button
                  className="mt-4 w-full rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-tide"
                  onClick={() => setRevealed(true)}
                  type="button"
                >
                  Reveal answer
                </button>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  {reviewActions.map((action) => (
                    <button
                      className={`rounded-2xl border px-4 py-4 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${action.className}`}
                      disabled={!token || reviewMutation.isPending}
                      key={action.label}
                      onClick={() => reviewCard(activeCard, action.rating)}
                      type="button"
                    >
                      <span className="block text-base font-semibold">{action.label}</span>
                      <span className="mt-1 block text-xs opacity-75">{action.helper}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-[2.5rem] border border-tide/20 bg-tide/10 p-8">
              <p className="text-2xl font-semibold text-white">Review sprint complete</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                All due cards are handled. The next session will reopen cards based on their spacing interval.
              </p>
            </div>
          )}
        </section>

        <aside className="grid gap-6">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-tide">Deck Queue</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Due and upcoming cards</h2>
              </div>
              <span className="text-sm font-semibold text-gold">{progress}%</span>
            </div>
            <div className="mt-5 space-y-3">
              {deck.flashcards.map((card) => {
                const cardIndex = dueCards.findIndex((dueCard) => dueCard.id === card.id);
                const status = reviewedIds.has(card.id) ? "Done" : isDue(card) ? "Due" : "Later";
                return (
                  <button
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-left transition hover:border-tide/30 hover:bg-slate-900"
                    key={card.id}
                    onClick={() => {
                      if (cardIndex >= 0) {
                        setActiveIndex(cardIndex);
                        setRevealed(false);
                      }
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-white">{card.front}</p>
                      <span className={status === "Done" ? "text-xs font-semibold text-emerald-200" : "text-xs font-semibold text-gold"}>
                        {status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm capitalize text-slate-400">
                      {card.difficulty} - {formatDue(card.dueAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-ember">Spacing Logic</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Review quality changes due dates.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Missed cards return tomorrow, solid answers move out, and easy cards stretch further. The backend stores
              each review so the schedule survives across devices.
            </p>
          </div>
        </aside>
      </div>
    </LayoutShell>
  );
}
