from app.core.security import create_access_token
from app.models.entities import CourseTopic, QuizQuestion, QuizSet
from app.models.enums import QuizQuestionType


def bearer_for(user) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)}"}


def create_quiz_set(db_session, seeded_data) -> tuple[CourseTopic, QuizSet, list[QuizQuestion]]:
    topic = CourseTopic(
        course_id=seeded_data["course"].id,
        title="Graph tracing",
        description="BFS and DFS traversal practice.",
    )
    db_session.add(topic)
    db_session.flush()
    quiz = QuizSet(
        user_id=seeded_data["owner"].id,
        course_id=seeded_data["course"].id,
        topic_id=topic.id,
        material_id=seeded_data["material"].id,
        title="Graph Traversal Quiz",
        difficulty="medium",
        question_count=2,
        metadata_json={"source": "test"},
    )
    db_session.add(quiz)
    db_session.flush()
    questions = [
        QuizQuestion(
            quiz_set_id=quiz.id,
            prompt="Which structure powers BFS?",
            question_type=QuizQuestionType.MCQ,
            options=["Stack", "Queue", "Heap", "Set"],
            correct_answer="Queue",
            explanation="BFS explores level by level, which matches queue behavior.",
            order_index=0,
        ),
        QuizQuestion(
            quiz_set_id=quiz.id,
            prompt="True or false: DFS always finds shortest unweighted paths.",
            question_type=QuizQuestionType.TRUE_FALSE,
            options=["True", "False"],
            correct_answer="False",
            explanation="DFS can go deep before discovering shorter alternatives.",
            order_index=1,
        ),
    ]
    db_session.add_all(questions)
    db_session.commit()
    return topic, quiz, questions


def test_quiz_set_response_includes_questions_without_correct_answers(
    client,
    db_session,
    seeded_data,
):
    _, quiz, questions = create_quiz_set(db_session, seeded_data)

    response = client.get(
        f"/api/v1/quizzes/sets/{quiz.id}",
        headers=bearer_for(seeded_data["owner"]),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == quiz.id
    assert payload["questions"][0]["id"] == questions[0].id
    assert payload["questions"][0]["questionType"] == "mcq"
    assert payload["questions"][0]["options"] == ["Stack", "Queue", "Heap", "Set"]
    assert "correctAnswer" not in payload["questions"][0]


def test_quiz_set_list_exposes_owned_quizzes(client, db_session, seeded_data):
    _, quiz, _ = create_quiz_set(db_session, seeded_data)

    response = client.get("/api/v1/quizzes/sets", headers=bearer_for(seeded_data["owner"]))

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["id"] == quiz.id
    assert payload[0]["title"] == "Graph Traversal Quiz"
    assert payload[0]["questions"] == []


def test_quiz_attempt_scores_answers_and_returns_feedback(client, db_session, seeded_data):
    _, quiz, questions = create_quiz_set(db_session, seeded_data)

    response = client.post(
        "/api/v1/quizzes/attempts",
        headers=bearer_for(seeded_data["owner"]),
        json={
            "quizSetId": quiz.id,
            "durationSeconds": 92,
            "answers": [
                {"questionId": questions[0].id, "submittedAnswer": "Queue"},
                {"questionId": questions[1].id, "submittedAnswer": "True"},
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["score"] == 0.5
    assert payload["correctCount"] == 1
    assert payload["totalQuestions"] == 2
    assert payload["durationSeconds"] == 92
    assert payload["answers"][0]["isCorrect"] is True
    assert payload["answers"][0]["correctAnswer"] == "Queue"
    assert payload["answers"][1]["isCorrect"] is False
    assert (
        payload["answers"][1]["feedback"]
        == "DFS can go deep before discovering shorter alternatives."
    )


def test_quiz_attempt_updates_topic_performance(client, db_session, seeded_data):
    topic, quiz, questions = create_quiz_set(db_session, seeded_data)

    client.post(
        "/api/v1/quizzes/attempts",
        headers=bearer_for(seeded_data["owner"]),
        json={
            "quizSetId": quiz.id,
            "answers": [
                {"questionId": questions[0].id, "submittedAnswer": "Queue"},
                {"questionId": questions[1].id, "submittedAnswer": "False"},
            ],
        },
    )
    response = client.get(
        "/api/v1/quizzes/performance/overview",
        headers=bearer_for(seeded_data["owner"]),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["averageScore"] == 1.0
    assert payload["weakTopics"][0]["topicId"] == topic.id
    assert payload["weakTopics"][0]["topic"] == "Graph tracing"
    assert payload["weakTopics"][0]["masteryScore"] == 1.0


def test_student_cannot_attempt_another_students_quiz(client, db_session, seeded_data):
    _, quiz, questions = create_quiz_set(db_session, seeded_data)

    response = client.post(
        "/api/v1/quizzes/attempts",
        headers=bearer_for(seeded_data["other"]),
        json={
            "quizSetId": quiz.id,
            "answers": [{"questionId": questions[0].id, "submittedAnswer": "Queue"}],
        },
    )

    assert response.status_code == 404
