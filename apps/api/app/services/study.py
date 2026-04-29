from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.entities import (
    Flashcard,
    FlashcardDeck,
    FlashcardReview,
    Material,
    MaterialChunk,
    NoteSet,
    QuizAttempt,
    QuizAttemptAnswer,
    QuizQuestion,
    QuizSet,
    TopicMastery,
    User,
)
from app.schemas.study import (
    FlashcardGenerationRequest,
    FlashcardReviewRequest,
    NoteGenerationRequest,
    QuizAttemptRequest,
    QuizGenerationRequest,
)
from app.services.generation import generate_flashcards, generate_note_bundle, generate_quiz, select_note_content
from app.services.materials import ensure_course_access


def _source_text(db: Session, *, material_id: str | None, course_id: str | None) -> tuple[str, Material | None]:
    material = None
    if material_id:
        material = db.query(Material).filter(Material.id == material_id, Material.deleted_at.is_(None)).first()
        if not material:
            raise HTTPException(status_code=404, detail="Material not found.")
        text = material.transcript_text or material.extracted_text
        if not text:
            text = "\n".join(chunk.text for chunk in db.query(MaterialChunk).filter(MaterialChunk.material_id == material_id))
        return text or "", material
    if course_id:
        materials = db.query(Material).filter(Material.course_id == course_id, Material.deleted_at.is_(None)).all()
        text = "\n\n".join((item.transcript_text or item.extracted_text or "") for item in materials)
        return text, materials[0] if materials else None
    raise HTTPException(status_code=400, detail="A material_id or course_id is required.")


def generate_notes(db: Session, *, user: User, payload: NoteGenerationRequest) -> NoteSet:
    if payload.course_id:
        ensure_course_access(db, user=user, course_id=payload.course_id)
    text, material = _source_text(db, material_id=payload.material_id, course_id=payload.course_id)
    bundle = generate_note_bundle(text)
    note = NoteSet(
        user_id=user.id,
        course_id=payload.course_id or (material.course_id if material else None),
        topic_id=payload.topic_id,
        material_id=payload.material_id,
        note_type=payload.note_type,
        title=f"{payload.note_type.value.replace('_', ' ').title()}",
        content_markdown=select_note_content(bundle, payload.note_type),
        metadata_json={
            "key_terms": bundle.key_terms,
            "exam_questions": bundle.exam_questions,
        },
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def generate_flashcard_deck(db: Session, *, user: User, payload: FlashcardGenerationRequest) -> FlashcardDeck:
    text, material = _source_text(db, material_id=payload.material_id, course_id=payload.course_id)
    result = generate_flashcards(text, payload.limit)
    deck = FlashcardDeck(
        user_id=user.id,
        course_id=payload.course_id or (material.course_id if material else None),
        topic_id=payload.topic_id,
        material_id=payload.material_id,
        title="Auto-generated flashcard deck",
        source_scope="material" if payload.material_id else "course",
        metadata_json={"card_count": len(result.cards)},
    )
    db.add(deck)
    db.flush()
    for index, card in enumerate(result.cards):
        db.add(
            Flashcard(
                deck_id=deck.id,
                front=card.front,
                back=card.back,
                difficulty=card.difficulty,
                tags=card.tags,
                explanation=card.explanation,
                order_index=index,
            )
        )
    db.commit()
    db.refresh(deck)
    return deck


def calculate_flashcard_schedule(
    *, previous_interval_days: int | None, previous_ease_factor: float | None, rating: int
) -> tuple[int, float]:
    previous_interval = max(1, previous_interval_days or 1)
    previous_ease = max(1.3, previous_ease_factor or 2.5)
    ease_delta = {1: -0.35, 2: -0.2, 3: -0.05, 4: 0.08, 5: 0.16}[rating]
    ease_factor = min(3.0, max(1.3, round(previous_ease + ease_delta, 2)))

    if rating <= 2:
        interval_days = 1
    elif rating == 3:
        interval_days = max(2, previous_interval + 1)
    elif rating == 4:
        interval_days = max(3, round(previous_interval * ease_factor))
    else:
        interval_days = max(4, round(previous_interval * (ease_factor + 0.8)))

    return interval_days, ease_factor


def review_flashcard(db: Session, *, user: User, deck_id: str, payload: FlashcardReviewRequest) -> FlashcardReview:
    card = (
        db.query(Flashcard)
        .join(FlashcardDeck, Flashcard.deck_id == FlashcardDeck.id)
        .filter(Flashcard.id == payload.flashcard_id, FlashcardDeck.id == deck_id, FlashcardDeck.user_id == user.id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found.")
    previous = (
        db.query(FlashcardReview)
        .filter(FlashcardReview.flashcard_id == card.id, FlashcardReview.user_id == user.id)
        .order_by(FlashcardReview.reviewed_at.desc())
        .first()
    )
    reviewed_at = datetime.now(UTC)
    interval, ease_factor = calculate_flashcard_schedule(
        previous_interval_days=previous.interval_days if previous else None,
        previous_ease_factor=previous.ease_factor if previous else None,
        rating=payload.rating,
    )
    review = FlashcardReview(
        flashcard_id=card.id,
        user_id=user.id,
        rating=payload.rating,
        reviewed_at=reviewed_at,
        due_at=reviewed_at + timedelta(days=interval),
        interval_days=interval,
        ease_factor=ease_factor,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def generate_quiz_set(db: Session, *, user: User, payload: QuizGenerationRequest) -> QuizSet:
    text, material = _source_text(db, material_id=payload.material_id, course_id=payload.course_id)
    result = generate_quiz(text, payload.count, payload.include_scenarios)
    quiz_set = QuizSet(
        user_id=user.id,
        course_id=payload.course_id or (material.course_id if material else None),
        topic_id=payload.topic_id,
        material_id=payload.material_id,
        title="Auto-generated quiz",
        difficulty=payload.difficulty,
        question_count=len(result.questions),
        metadata_json={"generated": True},
    )
    db.add(quiz_set)
    db.flush()
    for index, question in enumerate(result.questions):
        db.add(
            QuizQuestion(
                quiz_set_id=quiz_set.id,
                prompt=question.prompt,
                question_type=question.question_type,
                options=question.options,
                correct_answer=question.correct_answer,
                explanation=question.explanation,
                order_index=index,
            )
        )
    db.commit()
    db.refresh(quiz_set)
    return quiz_set


def submit_quiz_attempt(db: Session, *, user: User, payload: QuizAttemptRequest) -> QuizAttempt:
    quiz_set = db.query(QuizSet).filter(QuizSet.id == payload.quiz_set_id).first()
    if not quiz_set:
        raise HTTPException(status_code=404, detail="Quiz set not found.")
    questions = {
        question.id: question for question in db.query(QuizQuestion).filter(QuizQuestion.quiz_set_id == quiz_set.id).all()
    }
    correct = 0
    attempt = QuizAttempt(
        quiz_set_id=quiz_set.id,
        user_id=user.id,
        total_questions=len(questions),
        duration_seconds=payload.duration_seconds,
    )
    db.add(attempt)
    db.flush()
    for answer in payload.answers:
        question = questions.get(answer.question_id)
        if not question:
            continue
        is_correct = answer.submitted_answer.strip().lower() == question.correct_answer.strip().lower()
        if is_correct:
            correct += 1
        db.add(
            QuizAttemptAnswer(
                quiz_attempt_id=attempt.id,
                quiz_question_id=question.id,
                submitted_answer=answer.submitted_answer,
                is_correct=is_correct,
                score_awarded=1.0 if is_correct else 0.0,
                feedback=question.explanation,
            )
        )
    attempt.correct_count = correct
    attempt.score = correct / max(1, len(questions))
    if quiz_set.topic_id:
        existing_mastery = (
            db.query(TopicMastery)
            .filter(TopicMastery.user_id == user.id, TopicMastery.topic_id == quiz_set.topic_id)
            .first()
        )
        if existing_mastery:
            existing_mastery.mastery_score = attempt.score
            existing_mastery.last_reviewed_at = datetime.now(UTC)
            existing_mastery.weak_reason = "Auto-updated from quiz attempt"
        else:
            db.add(
                TopicMastery(
                    user_id=user.id,
                    topic_id=quiz_set.topic_id,
                    mastery_score=attempt.score,
                    last_reviewed_at=datetime.now(UTC),
                    weak_reason="Auto-updated from quiz attempt",
                )
            )
    db.commit()
    db.refresh(attempt)
    return attempt


def performance_overview(db: Session, *, user: User) -> dict:
    average = (
        db.query(func.avg(QuizAttempt.score))
        .filter(QuizAttempt.user_id == user.id, QuizAttempt.deleted_at.is_(None))
        .scalar()
        or 0.0
    )
    weak_topics = (
        db.query(TopicMastery.topic_id, TopicMastery.mastery_score, TopicMastery.weak_reason)
        .filter(TopicMastery.user_id == user.id, TopicMastery.deleted_at.is_(None))
        .order_by(TopicMastery.mastery_score.asc())
        .limit(5)
        .all()
    )
    return {
        "average_score": round(float(average), 2),
        "weak_topics": [
            {"topic_id": topic_id, "mastery_score": mastery_score, "reason": reason}
            for topic_id, mastery_score, reason in weak_topics
        ],
    }
