from __future__ import annotations

import hashlib
from pathlib import Path

from pydantic import BaseModel

from app.models.enums import QuizQuestionType
from app.providers.base import EmbeddingProvider, LLMProvider, SpeechToTextProvider, TranscriptionSegment
from app.schemas.study import (
    FlashcardGenerationResult,
    FlashcardItem,
    NoteGenerationResult,
    QuizGenerationResult,
    QuizQuestionItem,
)


class MockLLMProvider(LLMProvider):
    def generate_structured(self, *, prompt: str, schema: type[BaseModel]):
        lowered = prompt.lower()
        if schema is NoteGenerationResult:
            return NoteGenerationResult(
                summary=f"Summary: {prompt[:180]}",
                detailed_notes=f"Detailed notes generated from source material.\n\n{prompt[:500]}",
                concise_notes="\n".join([f"- {line.strip()}" for line in prompt.splitlines()[:6] if line.strip()]),
                key_terms=["concept map", "active recall", "assessment design"],
                exam_questions=[
                    "How would you apply the core concept in a real exam scenario?",
                    "Which supporting evidence best explains the main topic?",
                ],
                teach_me="Imagine you are explaining this lecture to a first-year student.",
                revision_sheet="One-page revision sheet: definitions, formulas, examples, and common mistakes.",
            )
        if schema is QuizGenerationResult:
            questions = [
                QuizQuestionItem(
                    prompt="What is the main idea discussed in the uploaded material?",
                    question_type=QuizQuestionType.MCQ,
                    options=["A supporting detail", "The central concept", "A citation", "A footer"],
                    correct_answer="The central concept",
                    explanation="The mock pipeline focuses on identifying the dominant idea across chunks.",
                ),
                QuizQuestionItem(
                    prompt="True or false: source citations should be preserved for study answers.",
                    question_type=QuizQuestionType.TRUE_FALSE,
                    options=["True", "False"],
                    correct_answer="True",
                    explanation="CampusStudy AI stores page, slide, and timestamp-aware citations.",
                ),
            ]
            if "scenario" in lowered:
                questions.append(
                    QuizQuestionItem(
                        prompt="A student is revising the night before the exam. Which asset helps fastest?",
                        question_type=QuizQuestionType.SCENARIO,
                        options=None,
                        correct_answer="The concise notes and revision sheet.",
                        explanation="Both optimize for quick recall and last-minute revision.",
                    )
                )
            return QuizGenerationResult(questions=questions)
        if schema is FlashcardGenerationResult:
            return FlashcardGenerationResult(
                cards=[
                    FlashcardItem(
                        front="What should you revise first from this material?",
                        back="Start with the core learning outcomes and definitions.",
                        difficulty="easy",
                        tags=["overview", "revision"],
                        explanation="Anchoring on the learning outcomes makes the rest easier to place.",
                    ),
                    FlashcardItem(
                        front="Which study technique is best after reading the notes once?",
                        back="Active recall using flashcards or a short quiz.",
                        difficulty="medium",
                        tags=["study-skills"],
                        explanation="Retrieval practice strengthens memory more than re-reading.",
                    ),
                ]
            )
        return schema.model_validate({})

    def answer_with_context(self, *, prompt: str, context: list[str]) -> str:
        evidence = "\n".join(f"- {snippet[:220]}" for snippet in context[:4])
        return f"Based on the retrieved study material, here is a grounded answer:\n\n{evidence}\n\nQuestion: {prompt}"


class MockEmbeddingProvider(EmbeddingProvider):
    def __init__(self, dimensions: int = 16) -> None:
        self.dimensions = dimensions

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            digest = hashlib.sha256(text.encode("utf-8")).digest()
            values = [((digest[index] / 255) * 2) - 1 for index in range(self.dimensions)]
            vectors.append(values)
        return vectors


class MockSpeechToTextProvider(SpeechToTextProvider):
    def transcribe(self, file_path: Path) -> list[TranscriptionSegment]:
        name = file_path.stem.replace("_", " ").replace("-", " ").title()
        return [
            TranscriptionSegment(
                start_second=0,
                end_second=45,
                text=f"{name} lecture introduction covering learning objectives and exam framing.",
            ),
            TranscriptionSegment(
                start_second=46,
                end_second=120,
                text=f"{name} lecture explains the core theory, a worked example, and recall cues.",
            ),
            TranscriptionSegment(
                start_second=121,
                end_second=180,
                text=f"{name} lecture wraps with revision tips, misconceptions, and exam warnings.",
            ),
        ]
