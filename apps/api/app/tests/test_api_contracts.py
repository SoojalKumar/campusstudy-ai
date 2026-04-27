from app.core.security import create_access_token
from app.providers.storage import get_storage_backend
from app.models.entities import CourseTopic, Material, NoteSet, QuizAttempt, QuizSet, TopicMastery
from app.models.enums import MaterialKind, NoteType, ProcessingStage, ProcessingStatus


def bearer_for(user) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)}"}


def test_material_list_only_returns_student_owned_items(client, db_session, seeded_data):
    other_material = Material(
        owner_user_id=seeded_data["other"].id,
        course_id=seeded_data["course"].id,
        title="Other Student Notes",
        file_name="other-notes.txt",
        file_type="txt",
        mime_type="text/plain",
        size_bytes=84,
        storage_key="tests/other-notes.txt",
        source_kind=MaterialKind.DOCUMENT,
        processing_stage=ProcessingStage.COMPLETED,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="This should stay private to the other student.",
        source_metadata={"visibility": "private"},
    )
    db_session.add(other_material)
    db_session.commit()

    response = client.get("/api/v1/materials", headers=bearer_for(seeded_data["owner"]))

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["id"] == seeded_data["material"].id
    assert payload[0]["ownerUserId"] == seeded_data["owner"].id
    assert payload[0]["courseId"] == seeded_data["course"].id
    assert payload[0]["fileName"] == "notes.txt"
    assert payload[0]["processingStage"] == ProcessingStage.COMPLETED.value
    assert payload[0]["downloadUrl"] == f"http://testserver/api/v1/materials/{seeded_data['material'].id}/download"
    assert "owner_user_id" not in payload[0]
    assert "processing_stage" not in payload[0]


def test_material_download_streams_file_only_for_authorized_user(client, seeded_data):
    storage = get_storage_backend()
    original_bytes = b"Binary study notes."
    storage.save_bytes(
        key=seeded_data["material"].storage_key,
        content=original_bytes,
        content_type=seeded_data["material"].mime_type,
    )

    owner_response = client.get(
        f"/api/v1/materials/{seeded_data['material'].id}/download?disposition=inline",
        headers=bearer_for(seeded_data["owner"]),
    )
    other_response = client.get(
        f"/api/v1/materials/{seeded_data['material'].id}/download",
        headers=bearer_for(seeded_data["other"]),
    )

    assert owner_response.status_code == 200
    assert owner_response.content == original_bytes
    assert owner_response.headers["content-type"].startswith("text/plain")
    assert "inline" in owner_response.headers["content-disposition"]
    assert "notes.txt" in owner_response.headers["content-disposition"]
    assert owner_response.headers["cache-control"] == "no-store"
    assert owner_response.headers["x-request-id"]
    assert other_response.status_code == 403


def test_dashboard_overview_uses_camel_case_contract(client, db_session, seeded_data):
    topic = CourseTopic(course_id=seeded_data["course"].id, title="Testing Fundamentals")
    db_session.add(topic)
    db_session.flush()

    quiz_set = QuizSet(
        user_id=seeded_data["owner"].id,
        course_id=seeded_data["course"].id,
        topic_id=topic.id,
        material_id=seeded_data["material"].id,
        title="Testing Quiz",
        difficulty="medium",
        question_count=5,
        metadata_json={"source": "generated"},
    )
    db_session.add(quiz_set)
    db_session.flush()

    db_session.add(
        TopicMastery(user_id=seeded_data["owner"].id, topic_id=topic.id, mastery_score=0.32, weak_reason="Needs review")
    )
    db_session.add(
        QuizAttempt(
            quiz_set_id=quiz_set.id,
            user_id=seeded_data["owner"].id,
            score=80,
            total_questions=5,
            correct_count=4,
        )
    )
    db_session.add(
        NoteSet(
            user_id=seeded_data["owner"].id,
            course_id=seeded_data["course"].id,
            topic_id=topic.id,
            material_id=seeded_data["material"].id,
            note_type=NoteType.SUMMARY,
            title="Testing Summary",
            content_markdown="Key ideas from the first lecture.",
            metadata_json={"source": "generated"},
        )
    )
    db_session.commit()

    response = client.get("/api/v1/dashboard/overview", headers=bearer_for(seeded_data["owner"]))

    assert response.status_code == 200
    assert "X-Request-ID" in response.headers

    payload = response.json()
    assert payload["streakDays"] == 5
    assert payload["dueFlashcards"] == 0
    assert payload["recentQuizAverage"] == 80.0
    assert payload["weakTopics"][0] == {"topic": "Testing Fundamentals", "mastery": 0.32}
    assert payload["recentUploads"][0]["id"] == seeded_data["material"].id
    assert payload["recentUploads"][0]["courseTitle"] == seeded_data["course"].title
    assert payload["latestNotes"][0]["title"] == "Testing Summary"
    assert payload["latestNotes"][0]["contentMarkdown"] == "Key ideas from the first lecture."
    assert "streak_days" not in payload
    assert "recent_uploads" not in payload
