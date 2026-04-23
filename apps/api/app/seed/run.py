from __future__ import annotations

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.entities import (
    Course,
    CourseTopic,
    Department,
    Enrollment,
    Flashcard,
    FlashcardDeck,
    Material,
    MaterialChunk,
    NoteSet,
    ProcessingJob,
    QuizAttempt,
    QuizAttemptAnswer,
    QuizQuestion,
    QuizSet,
    TopicMastery,
    TranscriptSegment,
    University,
    User,
)
from app.models.enums import (
    MaterialKind,
    NoteType,
    ProcessingStage,
    ProcessingStatus,
    QuizQuestionType,
    UserRole,
)
from app.providers.storage import get_storage_backend
from app.services.chunking import chunk_sections
from app.services.extraction import ExtractedSection
from app.services.generation import generate_flashcards, generate_note_bundle, generate_quiz


def get_or_create(model, db, defaults=None, **lookup):
    instance = db.query(model).filter_by(**lookup).first()
    if instance:
        return instance
    payload = {**lookup, **(defaults or {})}
    instance = model(**payload)
    db.add(instance)
    db.flush()
    return instance


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    storage = get_storage_backend()

    university = get_or_create(
        University,
        db,
        name="Pacific State University",
        slug="pacific-state",
        email_domain="student.pacific.edu",
        allow_self_signup=True,
    )

    cs_department = get_or_create(
        Department,
        db,
        university_id=university.id,
        code="CS",
        defaults={"name": "Computer Science"},
    )
    science_department = get_or_create(
        Department,
        db,
        university_id=university.id,
        code="BIO",
        defaults={"name": "Life Sciences"},
    )

    courses = [
        ("CS101", "Foundations of Programming", cs_department.id),
        ("CS220", "Data Structures for Study Systems", cs_department.id),
        ("CS340", "Machine Learning in Education", cs_department.id),
        ("BIO110", "Cellular Biology", science_department.id),
        ("BIO220", "Human Physiology", science_department.id),
    ]
    course_models: dict[str, Course] = {}
    for code, title, department_id in courses:
        course_models[code] = get_or_create(
            Course,
            db,
            university_id=university.id,
            department_id=department_id,
            code=code,
            term="Fall",
            year=2026,
            defaults={
                "title": title,
                "description": f"{title} for the Fall 2026 semester.",
                "is_active": True,
            },
        )

    topics = [
        ("Algorithms", course_models["CS220"].id, None),
        ("Trees and Graphs", course_models["CS220"].id, None),
        ("Supervised Learning", course_models["CS340"].id, None),
        ("Neural Networks", course_models["CS340"].id, None),
        ("Cell Membrane", course_models["BIO110"].id, None),
        ("Cardiovascular System", course_models["BIO220"].id, None),
    ]
    topic_models: dict[str, CourseTopic] = {}
    for title, course_id, parent_topic_id in topics:
        topic_models[title] = get_or_create(
            CourseTopic,
            db,
            course_id=course_id,
            title=title,
            defaults={"description": f"Demo topic for {title}", "parent_topic_id": parent_topic_id},
        )

    admin_user = get_or_create(
        User,
        db,
        email="admin@pacific.edu",
        defaults={
            "hashed_password": hash_password("AdminPass123!"),
            "name": "Campus Admin",
            "role": UserRole.ADMIN,
            "university_id": university.id,
            "major": "Administration",
            "semester": "Staff",
            "is_active": True,
            "is_verified": True,
        },
    )
    students = [
        ("maya@student.pacific.edu", "Maya Chen", "Computer Science", "Semester 5"),
        ("jordan@student.pacific.edu", "Jordan Singh", "Biology", "Semester 3"),
        ("elena@student.pacific.edu", "Elena Park", "Computer Science", "Semester 7"),
    ]
    student_models: list[User] = []
    for email, name, major, semester in students:
        student_models.append(
            get_or_create(
                User,
                db,
                email=email,
                defaults={
                    "hashed_password": hash_password("StudentPass123!"),
                    "name": name,
                    "role": UserRole.STUDENT,
                    "university_id": university.id,
                    "major": major,
                    "semester": semester,
                    "is_active": True,
                    "is_verified": True,
                },
            )
        )

    enrollment_pairs = [
        (student_models[0].id, course_models["CS101"].id),
        (student_models[0].id, course_models["CS220"].id),
        (student_models[0].id, course_models["CS340"].id),
        (student_models[1].id, course_models["BIO110"].id),
        (student_models[1].id, course_models["BIO220"].id),
        (student_models[2].id, course_models["CS220"].id),
        (student_models[2].id, course_models["CS340"].id),
    ]
    for user_id, course_id in enrollment_pairs:
        get_or_create(Enrollment, db, user_id=user_id, course_id=course_id, defaults={"status": "active"})

    material_seed_text = (
        "CampusStudy AI demo lecture on graph traversal. Breadth-first search visits nodes level by level. "
        "Depth-first search explores a branch deeply before backtracking. Exam questions often compare time "
        "complexity, memory trade-offs, and best-fit use cases for BFS versus DFS. Students should connect each "
        "algorithm to queue or stack behavior and practice tracing small graphs."
    )
    storage_key = f"seed/{student_models[0].id}/graph-traversal-demo.txt"
    storage.save_bytes(key=storage_key, content=material_seed_text.encode("utf-8"), content_type="text/plain")
    material = get_or_create(
        Material,
        db,
        owner_user_id=student_models[0].id,
        course_id=course_models["CS220"].id,
        title="Graph Traversal Lecture Notes",
        defaults={
            "topic_id": topic_models["Trees and Graphs"].id,
            "file_name": "graph-traversal-demo.txt",
            "file_type": "txt",
            "mime_type": "text/plain",
            "size_bytes": len(material_seed_text.encode("utf-8")),
            "storage_key": storage_key,
            "source_kind": MaterialKind.DOCUMENT,
            "processing_stage": ProcessingStage.COMPLETED,
            "processing_status": ProcessingStatus.COMPLETED,
            "extracted_text": material_seed_text,
            "transcript_text": None,
            "checksum": "seed-graph-traversal",
            "source_metadata": {"seeded": True},
        },
    )
    get_or_create(
        ProcessingJob,
        db,
        material_id=material.id,
        task_name="process_material_pipeline",
        defaults={
            "status": ProcessingStatus.COMPLETED,
            "stage": ProcessingStage.COMPLETED,
            "attempts": 1,
            "logs_json": [{"message": "Seed job completed", "stage": "completed"}],
        },
    )

    db.query(MaterialChunk).filter(MaterialChunk.material_id == material.id).delete()
    chunks = chunk_sections(
        [
            ExtractedSection(
                text=material_seed_text,
                page_number=1,
                section_heading="Graph Traversal",
            )
        ]
    )
    for draft, vector in zip(chunks, [[0.1] * 16 for _ in chunks], strict=False):
        db.add(
            MaterialChunk(
                material_id=material.id,
                chunk_index=draft.chunk_index,
                text=draft.text,
                token_count=draft.token_count,
                page_number=draft.page_number,
                section_heading=draft.section_heading,
                embedding=vector,
                metadata_json={"seeded": True},
            )
        )

    transcript_material_text = (
        "Lecture audio on supervised learning covers labelled data, bias-variance trade-off, and validation "
        "splits. Students are reminded to explain precision, recall, and overfitting with examples."
    )
    transcript_storage_key = f"seed/{student_models[2].id}/supervised-learning-demo.mp3"
    storage.save_bytes(
        key=transcript_storage_key,
        content=transcript_material_text.encode("utf-8"),
        content_type="audio/mpeg",
    )
    transcript_material = get_or_create(
        Material,
        db,
        owner_user_id=student_models[2].id,
        course_id=course_models["CS340"].id,
        title="Supervised Learning Lecture Audio",
        defaults={
            "topic_id": topic_models["Supervised Learning"].id,
            "file_name": "supervised-learning-demo.mp3",
            "file_type": "mp3",
            "mime_type": "audio/mpeg",
            "size_bytes": len(transcript_material_text.encode("utf-8")),
            "storage_key": transcript_storage_key,
            "source_kind": MaterialKind.AUDIO,
            "processing_stage": ProcessingStage.COMPLETED,
            "processing_status": ProcessingStatus.COMPLETED,
            "extracted_text": transcript_material_text,
            "transcript_text": transcript_material_text,
            "checksum": "seed-supervised-learning",
            "source_metadata": {"seeded": True},
        },
    )
    db.query(TranscriptSegment).filter(TranscriptSegment.material_id == transcript_material.id).delete()
    db.add_all(
        [
            TranscriptSegment(
                material_id=transcript_material.id,
                start_second=0,
                end_second=45,
                text="Introduction to labelled data and feature-target relationships.",
                language="en",
            ),
            TranscriptSegment(
                material_id=transcript_material.id,
                start_second=46,
                end_second=90,
                text="Bias-variance trade-off and why validation splits matter for exams.",
                language="en",
            ),
        ]
    )

    bundle = generate_note_bundle(material_seed_text)
    for note_type in [NoteType.SUMMARY, NoteType.CONCISE, NoteType.DETAILED]:
        content = {
            NoteType.SUMMARY: bundle.summary,
            NoteType.CONCISE: bundle.concise_notes,
            NoteType.DETAILED: bundle.detailed_notes,
        }[note_type]
        get_or_create(
            NoteSet,
            db,
            user_id=student_models[0].id,
            material_id=material.id,
            note_type=note_type,
            defaults={
                "course_id": material.course_id,
                "topic_id": material.topic_id,
                "title": f"{note_type.value.title()} for Graph Traversal",
                "content_markdown": content,
                "metadata_json": {"seeded": True},
            },
        )

    flashcard_result = generate_flashcards(material_seed_text, 6)
    deck = get_or_create(
        FlashcardDeck,
        db,
        user_id=student_models[0].id,
        material_id=material.id,
        defaults={
            "course_id": material.course_id,
            "topic_id": material.topic_id,
            "title": "Graph Traversal Deck",
            "source_scope": "material",
            "metadata_json": {"seeded": True},
        },
    )
    if not db.query(Flashcard).filter(Flashcard.deck_id == deck.id).first():
        for index, card in enumerate(flashcard_result.cards):
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

    quiz_result = generate_quiz(material_seed_text, 3, True)
    quiz_set = get_or_create(
        QuizSet,
        db,
        user_id=student_models[0].id,
        material_id=material.id,
        defaults={
            "course_id": material.course_id,
            "topic_id": material.topic_id,
            "title": "Graph Traversal Quiz",
            "difficulty": "medium",
            "question_count": len(quiz_result.questions),
            "metadata_json": {"seeded": True},
        },
    )
    if not db.query(QuizQuestion).filter(QuizQuestion.quiz_set_id == quiz_set.id).first():
        for index, question in enumerate(quiz_result.questions):
            db.add(
                QuizQuestion(
                    quiz_set_id=quiz_set.id,
                    prompt=question.prompt,
                    question_type=QuizQuestionType(question.question_type),
                    options=question.options,
                    correct_answer=question.correct_answer,
                    explanation=question.explanation,
                    order_index=index,
                )
            )
        db.flush()
        created_questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_set_id == quiz_set.id).all()
        attempt = QuizAttempt(
            quiz_set_id=quiz_set.id,
            user_id=student_models[0].id,
            score=0.67,
            total_questions=len(created_questions),
            correct_count=2,
            duration_seconds=420,
        )
        db.add(attempt)
        db.flush()
        for question in created_questions:
            is_correct = question.order_index < 2
            db.add(
                QuizAttemptAnswer(
                    quiz_attempt_id=attempt.id,
                    quiz_question_id=question.id,
                    submitted_answer=question.correct_answer if is_correct else "Incorrect seed answer",
                    is_correct=is_correct,
                    score_awarded=1.0 if is_correct else 0.0,
                    feedback=question.explanation,
                )
            )

    get_or_create(
        TopicMastery,
        db,
        user_id=student_models[0].id,
        topic_id=topic_models["Trees and Graphs"].id,
        defaults={"mastery_score": 0.62, "weak_reason": "Needs more graph tracing practice."},
    )

    db.commit()
    db.close()
    print("CampusStudy AI seed data loaded.")


if __name__ == "__main__":
    main()

