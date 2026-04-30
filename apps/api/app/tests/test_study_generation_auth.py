from app.core.security import create_access_token


def bearer_for(user) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)}"}


def test_study_generation_rejects_another_students_material(client, seeded_data):
    material_id = seeded_data["material"].id
    endpoints = [
        ("/api/v1/notes/generate", {"materialId": material_id, "noteType": "summary"}),
        ("/api/v1/flashcards/generate", {"materialId": material_id, "limit": 4}),
        (
            "/api/v1/quizzes/generate",
            {"materialId": material_id, "difficulty": "medium", "count": 3, "includeScenarios": True},
        ),
    ]

    for path, payload in endpoints:
        response = client.post(path, headers=bearer_for(seeded_data["other"]), json=payload)

        assert response.status_code == 404


def test_owner_can_generate_study_assets_from_material(client, seeded_data):
    material_id = seeded_data["material"].id
    headers = bearer_for(seeded_data["owner"])

    note_response = client.post(
        "/api/v1/notes/generate",
        headers=headers,
        json={"materialId": material_id, "noteType": "revision_sheet"},
    )
    flashcard_response = client.post(
        "/api/v1/flashcards/generate",
        headers=headers,
        json={"materialId": material_id, "limit": 4},
    )
    quiz_response = client.post(
        "/api/v1/quizzes/generate",
        headers=headers,
        json={"materialId": material_id, "difficulty": "medium", "count": 3, "includeScenarios": True},
    )

    assert note_response.status_code == 200
    assert note_response.json()["materialId"] == material_id
    assert flashcard_response.status_code == 200
    assert flashcard_response.json()["flashcards"]
    assert quiz_response.status_code == 200
    assert quiz_response.json()["questions"]
