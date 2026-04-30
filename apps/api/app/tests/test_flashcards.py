from datetime import UTC, datetime, timedelta

from app.core.security import create_access_token
from app.models.entities import Flashcard, FlashcardDeck, FlashcardReview
from app.schemas.study import FlashcardReviewRequest
from app.services.study import calculate_flashcard_schedule, review_flashcard


def bearer_for(user) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)}"}


def create_deck_with_card(db_session, seeded_data) -> tuple[FlashcardDeck, Flashcard]:
    deck = FlashcardDeck(
        user_id=seeded_data["owner"].id,
        course_id=seeded_data["course"].id,
        material_id=seeded_data["material"].id,
        title="Testing Fundamentals Sprint",
        source_scope="material",
        metadata_json={"card_count": 1},
    )
    db_session.add(deck)
    db_session.flush()
    card = Flashcard(
        deck_id=deck.id,
        front="Why do regression tests matter?",
        back="They protect expected behavior while the product changes.",
        difficulty="medium",
        tags=["testing"],
        explanation="Tests catch behavior drift before students hit broken study flows.",
        order_index=0,
    )
    db_session.add(card)
    db_session.commit()
    return deck, card


def test_flashcard_schedule_responds_to_rating_quality():
    low_interval, low_ease = calculate_flashcard_schedule(
        previous_interval_days=6,
        previous_ease_factor=2.4,
        rating=1,
    )
    high_interval, high_ease = calculate_flashcard_schedule(
        previous_interval_days=6,
        previous_ease_factor=2.4,
        rating=5,
    )

    assert low_interval == 1
    assert low_ease < 2.4
    assert high_interval >= 19
    assert high_ease > 2.4


def test_review_flashcard_persists_due_date_and_repeat_interval(db_session, seeded_data):
    deck, card = create_deck_with_card(db_session, seeded_data)

    first = review_flashcard(
        db_session,
        user=seeded_data["owner"],
        deck_id=deck.id,
        payload=FlashcardReviewRequest(flashcard_id=card.id, rating=5),
    )
    second = review_flashcard(
        db_session,
        user=seeded_data["owner"],
        deck_id=deck.id,
        payload=FlashcardReviewRequest(flashcard_id=card.id, rating=1),
    )

    assert first.interval_days == 4
    assert first.due_at == first.reviewed_at + timedelta(days=4)
    assert second.interval_days == 1
    assert second.due_at == second.reviewed_at + timedelta(days=1)
    assert second.ease_factor < first.ease_factor


def test_review_endpoint_returns_camel_case_schedule(client, db_session, seeded_data):
    deck, card = create_deck_with_card(db_session, seeded_data)

    response = client.post(
        f"/api/v1/flashcards/decks/{deck.id}/review",
        headers=bearer_for(seeded_data["owner"]),
        json={"flashcardId": card.id, "rating": 4},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["flashcardId"] == card.id
    assert payload["rating"] == 4
    assert payload["intervalDays"] == 3
    assert "reviewId" in payload
    assert "dueAt" in payload
    assert "due_at" not in payload


def test_deck_response_uses_latest_review_due_date(client, db_session, seeded_data):
    deck, card = create_deck_with_card(db_session, seeded_data)
    older_due = datetime(2026, 1, 3, tzinfo=UTC)
    newer_due = datetime(2026, 2, 14, tzinfo=UTC)
    db_session.add_all(
        [
            FlashcardReview(
                flashcard_id=card.id,
                user_id=seeded_data["owner"].id,
                rating=2,
                reviewed_at=datetime(2026, 1, 1, tzinfo=UTC),
                due_at=older_due,
                interval_days=1,
                ease_factor=2.1,
            ),
            FlashcardReview(
                flashcard_id=card.id,
                user_id=seeded_data["owner"].id,
                rating=5,
                reviewed_at=datetime(2026, 1, 15, tzinfo=UTC),
                due_at=newer_due,
                interval_days=30,
                ease_factor=2.8,
            ),
        ]
    )
    db_session.commit()

    response = client.get(
        f"/api/v1/flashcards/decks/{deck.id}",
        headers=bearer_for(seeded_data["owner"]),
    )

    assert response.status_code == 200
    assert response.json()["flashcards"][0]["dueAt"].startswith("2026-02-14")
