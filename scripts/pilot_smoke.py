#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request


API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
UPLOAD_TIMEOUT_SECONDS = int(os.environ.get("PILOT_SMOKE_UPLOAD_TIMEOUT_SECONDS", "90"))


def request(path: str, *, token: str | None = None, method: str = "GET", payload: dict | None = None):
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API_BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed with {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(
            f"Could not reach API at {API_BASE_URL}. Start it with `make api-dev` or Docker Compose."
        ) from exc


def upload_text_material(*, token: str, course_id: str) -> dict:
    boundary = "----campusstudy-pilot-smoke-boundary"
    title = f"Pilot Smoke Upload {int(time.time())}"
    content = (
        "Pilot smoke upload verifies the real processing pipeline. "
        "Dijkstra relaxation updates shortest path estimates with a priority queue. "
        "This source should produce notes, flashcards, quiz questions, and cited chat answers."
    ).encode("utf-8")
    parts = [
        (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="course_id"\r\n\r\n'
            f"{course_id}\r\n"
        ).encode("utf-8"),
        (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="title"\r\n\r\n'
            f"{title}\r\n"
        ).encode("utf-8"),
        (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="file"; filename="pilot-smoke-upload.txt"\r\n'
            "Content-Type: text/plain\r\n\r\n"
        ).encode("utf-8"),
        content,
        f"\r\n--{boundary}--\r\n".encode("utf-8"),
    ]
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }
    req = urllib.request.Request(
        f"{API_BASE_URL}/materials/upload",
        data=b"".join(parts),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"POST /materials/upload failed with {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Could not upload material to API at {API_BASE_URL}.") from exc


def wait_for_material_completed(material_id: str, *, token: str) -> dict:
    deadline = time.time() + UPLOAD_TIMEOUT_SECONDS
    last_status = "unknown"
    while time.time() < deadline:
        material = request(f"/materials/{material_id}/status", token=token)
        last_status = f"{material['processingStatus']}/{material['processingStage']}"
        if material["processingStatus"] == "completed":
            return material
        if material["processingStatus"] == "failed":
            raise RuntimeError(f"Uploaded material failed processing: {material.get('errorMessage')}")
        time.sleep(2)
    raise RuntimeError(f"Uploaded material did not complete within {UPLOAD_TIMEOUT_SECONDS}s. Last status: {last_status}")


def login(email: str, password: str) -> tuple[str, dict]:
    payload = request("/auth/login", method="POST", payload={"email": email, "password": password})
    return payload["accessToken"], payload["user"]


def assert_non_empty(name: str, items: list) -> None:
    if not items:
        raise RuntimeError(f"Expected seeded {name}, but the API returned none. Run `make seed`.")


def first_with(items: list[dict], key: str) -> dict | None:
    return next((item for item in items if item.get(key)), None)


def main() -> int:
    print(f"CampusStudy AI pilot smoke against {API_BASE_URL}")
    student_token, student = login("maya@student.pacific.edu", "StudentPass123!")
    admin_token, admin = login("admin@pacific.edu", "AdminPass123!")
    print(f"OK student login: {student['email']}")
    print(f"OK admin login: {admin['email']}")

    dashboard = request("/dashboard/overview", token=student_token)
    materials = request("/materials", token=student_token)
    decks = request("/flashcards/decks", token=student_token)
    quizzes = request("/quizzes/sets", token=student_token)
    admin_jobs = request("/admin/jobs", token=admin_token)
    admin_metrics = request("/admin/metrics", token=admin_token)

    assert_non_empty("materials", materials)
    assert_non_empty("flashcard decks", decks)
    assert_non_empty("quiz sets", quizzes)
    print(f"OK dashboard streak: {dashboard['streakDays']} days")
    print(f"OK first material: {materials[0]['title']}")
    print(f"OK first flashcard deck: {decks[0]['title']}")
    print(f"OK first quiz set: {quizzes[0]['title']}")
    print(f"OK admin jobs visible: {len(admin_jobs)}")
    print(f"OK admin metrics users: {admin_metrics['totalUsers']}")

    material = materials[0]
    notes = request(f"/notes/by-material/{material['id']}", token=student_token)
    assert_non_empty("notes", notes)
    note = request(f"/notes/{notes[0]['id']}", token=student_token)
    if not note.get("contentMarkdown"):
        raise RuntimeError("Expected first note detail to include contentMarkdown.")
    print(f"OK note reader: {note['title']}")

    transcript_material = first_with(materials, "transcriptText") or material
    transcript = request(f"/transcripts/materials/{transcript_material['id']}/transcript", token=student_token)
    print(f"OK transcript endpoint: {len(transcript)} segments")

    deck = request(f"/flashcards/decks/{decks[0]['id']}", token=student_token)
    assert_non_empty("flashcards", deck["flashcards"])
    review = request(
        f"/flashcards/decks/{deck['id']}/review",
        token=student_token,
        method="POST",
        payload={"flashcardId": deck["flashcards"][0]["id"], "rating": 4},
    )
    if review["intervalDays"] < 1:
        raise RuntimeError("Expected flashcard review to return a future review interval.")
    print(f"OK flashcard review interval: {review['intervalDays']} days")

    quiz = request(f"/quizzes/sets/{quizzes[0]['id']}", token=student_token)
    assert_non_empty("quiz questions", quiz["questions"])
    first_question = quiz["questions"][0]
    submitted_answer = first_question["options"][0] if first_question.get("options") else "Pilot answer"
    attempt = request(
        "/quizzes/attempts",
        token=student_token,
        method="POST",
        payload={
            "quizSetId": quiz["id"],
            "durationSeconds": 45,
            "answers": [{"questionId": first_question["id"], "submittedAnswer": submitted_answer}],
        },
    )
    if attempt["totalQuestions"] < 1:
        raise RuntimeError("Expected quiz attempt response to include scored questions.")
    print(f"OK quiz attempt score: {attempt['score']}")

    thread = request(
        "/chat/threads",
        token=student_token,
        method="POST",
        payload={
            "title": "Pilot smoke thread",
            "scopeType": "workspace",
            "strictMode": True,
            "answerStyle": "exam-oriented",
        },
    )
    answer = request(
        f"/chat/threads/{thread['id']}/messages",
        token=student_token,
        method="POST",
        payload={"content": "What should I remember about BFS for the exam?"},
    )
    if not answer["citations"]:
        raise RuntimeError("Expected RAG citations for seeded workspace chat.")
    print(f"OK RAG chat citations: {len(answer['citations'])}")

    uploaded = upload_text_material(token=student_token, course_id=material["courseId"])
    print(f"OK upload accepted: {uploaded['title']}")
    completed_upload = wait_for_material_completed(uploaded["id"], token=student_token)
    print(f"OK upload processed: {completed_upload['processingStage']}")
    uploaded_notes = request(f"/notes/by-material/{uploaded['id']}", token=student_token)
    assert_non_empty("uploaded material notes", uploaded_notes)
    uploaded_decks = [
        deck for deck in request("/flashcards/decks", token=student_token) if deck.get("materialId") == uploaded["id"]
    ]
    uploaded_quizzes = [
        quiz for quiz in request("/quizzes/sets", token=student_token) if quiz.get("materialId") == uploaded["id"]
    ]
    assert_non_empty("uploaded material flashcard deck", uploaded_decks)
    assert_non_empty("uploaded material quiz set", uploaded_quizzes)
    upload_thread = request(
        "/chat/threads",
        token=student_token,
        method="POST",
        payload={
            "title": "Pilot upload source chat",
            "scopeType": "material",
            "materialId": uploaded["id"],
            "strictMode": True,
            "answerStyle": "exam-oriented",
        },
    )
    upload_answer = request(
        f"/chat/threads/{upload_thread['id']}/messages",
        token=student_token,
        method="POST",
        payload={"content": "What does this source say about Dijkstra relaxation?"},
    )
    if not upload_answer["citations"]:
        raise RuntimeError("Expected RAG citations for uploaded material chat.")
    print(f"OK uploaded material RAG citations: {len(upload_answer['citations'])}")
    print("Pilot smoke passed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1) from None
