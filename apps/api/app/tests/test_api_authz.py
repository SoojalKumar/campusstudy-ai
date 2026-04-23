from app.core.security import create_access_token


def bearer_for(user) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)}"}


def test_register_and_login_flow(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newstudent@student.pacific.edu",
            "password": "StudentPass123!",
            "name": "New Student",
            "major": "CS",
            "semester": "Semester 2",
        },
    )
    assert register_response.status_code == 200
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "newstudent@student.pacific.edu", "password": "StudentPass123!"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["email"] == "newstudent@student.pacific.edu"


def test_student_cannot_access_other_students_material(client, seeded_data):
    response = client.get(
        f"/api/v1/materials/{seeded_data['material'].id}",
        headers=bearer_for(seeded_data["other"]),
    )
    assert response.status_code == 403


def test_admin_can_access_user_list(client, seeded_data):
    response = client.get("/api/v1/admin/users", headers=bearer_for(seeded_data["admin"]))
    assert response.status_code == 200
    assert len(response.json()) >= 3
