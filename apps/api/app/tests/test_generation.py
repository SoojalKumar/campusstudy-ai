import pytest
from pydantic import ValidationError

from app.models.enums import QuizQuestionType
from app.schemas.study import QuizQuestionItem
from app.services.generation import generate_note_bundle


def test_generate_note_bundle_returns_all_expected_sections():
    result = generate_note_bundle("Sorting algorithms compare time complexity and memory trade-offs.")
    assert result.summary
    assert result.concise_notes
    assert result.detailed_notes
    assert result.key_terms


def test_quiz_schema_rejects_mcq_without_options():
    with pytest.raises(ValidationError):
        QuizQuestionItem(
            prompt="Which data structure is FIFO?",
            question_type=QuizQuestionType.MCQ,
            options=None,
            correct_answer="Queue",
            explanation="Queue is FIFO.",
        )

