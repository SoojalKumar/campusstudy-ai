from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import enforce_rate_limit, get_current_user, get_db
from app.models.entities import Flashcard, FlashcardDeck, FlashcardReview
from app.schemas.study import (
    FlashcardDeckResponse,
    FlashcardGenerationRequest,
    FlashcardResponse,
    FlashcardReviewRequest,
    FlashcardReviewResponse,
)
from app.services.study import generate_flashcard_deck, review_flashcard

router = APIRouter()


@router.post("/generate", response_model=FlashcardDeckResponse, dependencies=[Depends(enforce_rate_limit)])
def generate_deck(
    payload: FlashcardGenerationRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> FlashcardDeckResponse:
    deck = generate_flashcard_deck(db, user=user, payload=payload)
    return get_deck(deck.id, db=db, user=user)


@router.get("/decks/{deck_id}", response_model=FlashcardDeckResponse)
def get_deck(deck_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)) -> FlashcardDeckResponse:
    deck = db.query(FlashcardDeck).filter(FlashcardDeck.id == deck_id, FlashcardDeck.user_id == user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found.")
    cards = db.query(Flashcard).filter(Flashcard.deck_id == deck.id).order_by(Flashcard.order_index.asc()).all()
    latest_reviews = {}
    if cards:
        for review in (
            db.query(FlashcardReview)
            .filter(FlashcardReview.user_id == user.id, FlashcardReview.flashcard_id.in_([card.id for card in cards]))
            .order_by(FlashcardReview.reviewed_at.desc())
            .all()
        ):
            latest_reviews.setdefault(review.flashcard_id, review)
    return FlashcardDeckResponse(
        **FlashcardDeckResponse.model_validate(deck).model_dump(),
        flashcards=[
            FlashcardResponse(
                **FlashcardResponse.model_validate(card).model_dump(),
                due_at=latest_reviews.get(card.id).due_at if latest_reviews.get(card.id) else datetime.now(UTC),
            )
            for card in cards
        ],
    )


@router.post("/decks/{deck_id}/review", response_model=FlashcardReviewResponse)
def review_deck_card(
    deck_id: str,
    payload: FlashcardReviewRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> FlashcardReviewResponse:
    review = review_flashcard(db, user=user, deck_id=deck_id, payload=payload)
    return FlashcardReviewResponse(
        review_id=review.id,
        flashcard_id=review.flashcard_id,
        rating=review.rating,
        due_at=review.due_at,
        interval_days=review.interval_days,
    )
