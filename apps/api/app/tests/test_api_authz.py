from app.core.security import create_access_token
from app.models.entities import NoteSet, ProcessingJob
from app.models.enums import ProcessingStage, ProcessingStatus


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


def test_student_cannot_access_other_students_note(client, db_session, seeded_data):
    note = NoteSet(
        user_id=seeded_data["owner"].id,
        course_id=seeded_data["course"].id,
        material_id=seeded_data["material"].id,
        note_type="summary",
        title="Private summary",
        content_markdown="Only the owner should read this.",
        metadata_json={},
    )
    db_session.add(note)
    db_session.commit()

    own_response = client.get(f"/api/v1/notes/{note.id}", headers=bearer_for(seeded_data["owner"]))
    other_response = client.get(
        f"/api/v1/notes/{note.id}",
        headers=bearer_for(seeded_data["other"]),
    )

    assert own_response.status_code == 200
    assert own_response.json()["title"] == "Private summary"
    assert other_response.status_code == 404


def test_student_cannot_retry_processing_job(client, db_session, seeded_data):
    job = ProcessingJob(
        material_id=seeded_data["material"].id,
        task_name="process_material_pipeline",
        status=ProcessingStatus.FAILED,
        stage=ProcessingStage.FAILED,
        attempts=1,
        error_message="Extractor crashed.",
        logs_json=[{"stage": "failed", "message": "Extractor crashed."}],
    )
    db_session.add(job)
    db_session.commit()

    response = client.post(
        f"/api/v1/processing/jobs/{job.id}/retry",
        headers=bearer_for(seeded_data["owner"]),
    )

    assert response.status_code == 403


def test_admin_retry_processing_job_resets_state(client, db_session, seeded_data, monkeypatch):
    queued: list[tuple[str, str]] = []

    class FakeTask:
        @staticmethod
        def delay(material_id: str, job_id: str) -> None:
            queued.append((material_id, job_id))

    monkeypatch.setattr("app.api.routes.processing.process_material_pipeline", FakeTask)
    monkeypatch.setattr("app.api.routes.admin.process_material_pipeline", FakeTask)

    material = seeded_data["material"]
    material.processing_status = ProcessingStatus.FAILED
    material.processing_stage = ProcessingStage.FAILED
    material.error_message = "Extractor crashed."
    job = ProcessingJob(
        material_id=material.id,
        task_name="process_material_pipeline",
        status=ProcessingStatus.FAILED,
        stage=ProcessingStage.FAILED,
        attempts=1,
        error_message="Extractor crashed.",
        logs_json=[{"stage": "failed", "message": "Extractor crashed."}],
    )
    db_session.add(job)
    db_session.commit()

    response = client.post(
        f"/api/v1/processing/jobs/{job.id}/retry",
        headers=bearer_for(seeded_data["admin"]),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "pending"
    assert payload["stage"] == "uploaded"
    assert payload["errorMessage"] is None
    assert payload["logsJson"][-1]["message"] == "Job retry requested."
    assert queued == [(material.id, job.id)]

    db_session.refresh(material)
    assert material.processing_status == ProcessingStatus.PENDING
    assert material.processing_stage == ProcessingStage.UPLOADED
    assert material.error_message is None
