from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.entities import (
    Flashcard,
    FlashcardDeck,
    Material,
    MaterialChunk,
    NoteSet,
    ProcessingJob,
    QuizQuestion,
    QuizSet,
    StudyGuide,
    TranscriptSegment,
)
from app.models.enums import MaterialKind, NoteType, ProcessingStage, ProcessingStatus
from app.providers.factory import get_embedding_provider
from app.providers.storage import get_storage_backend
from app.services.chunking import chunk_sections
from app.services.extraction import MaterialExtractor
from app.services.generation import generate_flashcards, generate_note_bundle, generate_quiz


def append_job_log(job: ProcessingJob, stage: ProcessingStage, message: str) -> None:
    logs = list(job.logs_json or [])
    logs.append({"stage": stage.value, "message": message, "timestamp": datetime.now(UTC).isoformat()})
    job.logs_json = logs


def _note_payload(bundle, note_type: NoteType) -> tuple[str, dict]:
    if note_type == NoteType.SUMMARY:
        return bundle.summary, {"kind": "summary"}
    if note_type == NoteType.DETAILED:
        return bundle.detailed_notes, {"kind": "detailed"}
    if note_type == NoteType.CONCISE:
        return bundle.concise_notes, {"kind": "concise"}
    if note_type == NoteType.GLOSSARY:
        return "\n".join(f"- {term}" for term in bundle.key_terms), {"terms": bundle.key_terms}
    if note_type == NoteType.EXAM_QUESTIONS:
        return "\n".join(f"- {question}" for question in bundle.exam_questions), {
            "questions": bundle.exam_questions
        }
    if note_type == NoteType.TEACH_ME:
        return bundle.teach_me, {"style": "beginner"}
    return bundle.revision_sheet, {"style": "revision"}


def run_material_pipeline(material_id: str, job_id: str) -> None:
    db: Session = SessionLocal()
    try:
        material = db.query(Material).filter(Material.id == material_id).first()
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not material or not job:
            return

        storage = get_storage_backend()
        extractor = MaterialExtractor()
        embeddings = get_embedding_provider()

        material.processing_status = ProcessingStatus.RUNNING
        job.status = ProcessingStatus.RUNNING
        job.attempts += 1
        job.started_at = datetime.now(UTC)

        material.processing_stage = ProcessingStage.EXTRACTING
        job.stage = ProcessingStage.EXTRACTING
        append_job_log(job, ProcessingStage.EXTRACTING, "Extracting source content.")
        db.commit()

        if material.source_kind in {MaterialKind.AUDIO, MaterialKind.VIDEO}:
            material.processing_stage = ProcessingStage.TRANSCRIBING
            job.stage = ProcessingStage.TRANSCRIBING
            append_job_log(job, ProcessingStage.TRANSCRIBING, "Transcribing lecture media.")
            db.commit()

        content = storage.load_bytes(material.storage_key)
        extracted = extractor.extract(material, content)
        material.extracted_text = extracted.full_text
        material.transcript_text = "\n".join(segment.text for segment in extracted.transcript_segments) or None

        db.query(TranscriptSegment).filter(TranscriptSegment.material_id == material.id).delete()
        for segment in extracted.transcript_segments:
            db.add(
                TranscriptSegment(
                    material_id=material.id,
                    start_second=segment.start_second,
                    end_second=segment.end_second,
                    speaker_label=segment.speaker_label,
                    language=segment.language,
                    text=segment.text,
                )
            )
        db.commit()

        material.processing_stage = ProcessingStage.CHUNKING
        job.stage = ProcessingStage.CHUNKING
        append_job_log(job, ProcessingStage.CHUNKING, "Chunking normalized content.")
        db.commit()

        chunk_drafts = chunk_sections(extracted.sections)
        db.query(MaterialChunk).filter(MaterialChunk.material_id == material.id).delete()
        material.processing_stage = ProcessingStage.EMBEDDING
        job.stage = ProcessingStage.EMBEDDING
        append_job_log(job, ProcessingStage.EMBEDDING, "Generating embeddings for chunk retrieval.")
        db.commit()
        vectors = embeddings.embed_texts([draft.text for draft in chunk_drafts]) if chunk_drafts else []
        for draft, vector in zip(chunk_drafts, vectors, strict=False):
            db.add(
                MaterialChunk(
                    material_id=material.id,
                    chunk_index=draft.chunk_index,
                    text=draft.text,
                    token_count=draft.token_count,
                    page_number=draft.page_number,
                    slide_number=draft.slide_number,
                    section_heading=draft.section_heading,
                    start_second=draft.start_second,
                    end_second=draft.end_second,
                    metadata_json={},
                    embedding=vector,
                )
            )
        db.commit()

        source_text = material.transcript_text or material.extracted_text or ""
        bundle = generate_note_bundle(source_text)

        material.processing_stage = ProcessingStage.GENERATING_NOTES
        job.stage = ProcessingStage.GENERATING_NOTES
        append_job_log(job, ProcessingStage.GENERATING_NOTES, "Generating note sets and study guides.")
        db.commit()

        db.query(NoteSet).filter(NoteSet.material_id == material.id).delete()
        for note_type in NoteType:
            content_markdown, metadata = _note_payload(bundle, note_type)
            db.add(
                NoteSet(
                    user_id=material.owner_user_id,
                    course_id=material.course_id,
                    topic_id=material.topic_id,
                    material_id=material.id,
                    note_type=note_type,
                    title=f"{material.title} - {note_type.value.replace('_', ' ').title()}",
                    content_markdown=content_markdown,
                    metadata_json=metadata,
                )
            )
        db.query(StudyGuide).filter(StudyGuide.material_id == material.id).delete()
        db.add(
            StudyGuide(
                user_id=material.owner_user_id,
                course_id=material.course_id,
                topic_id=material.topic_id,
                material_id=material.id,
                guide_type="study_pack",
                title=f"{material.title} Study Pack",
                content_markdown=bundle.revision_sheet,
                metadata_json={"exam_questions": bundle.exam_questions, "key_terms": bundle.key_terms},
            )
        )
        db.commit()

        material.processing_stage = ProcessingStage.GENERATING_FLASHCARDS
        job.stage = ProcessingStage.GENERATING_FLASHCARDS
        append_job_log(job, ProcessingStage.GENERATING_FLASHCARDS, "Generating flashcard deck.")
        db.commit()

        flashcard_result = generate_flashcards(source_text, 12)
        db.query(Flashcard).filter(
            Flashcard.deck_id.in_(db.query(FlashcardDeck.id).filter(FlashcardDeck.material_id == material.id))
        ).delete(synchronize_session=False)
        db.query(FlashcardDeck).filter(FlashcardDeck.material_id == material.id).delete(synchronize_session=False)
        deck = FlashcardDeck(
            user_id=material.owner_user_id,
            course_id=material.course_id,
            topic_id=material.topic_id,
            material_id=material.id,
            title=f"{material.title} Flashcards",
            source_scope="material",
            metadata_json={"generated_from_pipeline": True},
        )
        db.add(deck)
        db.flush()
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
        db.commit()

        material.processing_stage = ProcessingStage.GENERATING_QUIZ
        job.stage = ProcessingStage.GENERATING_QUIZ
        append_job_log(job, ProcessingStage.GENERATING_QUIZ, "Generating quiz set.")
        db.commit()

        quiz_result = generate_quiz(source_text, 8, True)
        db.query(QuizQuestion).filter(
            QuizQuestion.quiz_set_id.in_(db.query(QuizSet.id).filter(QuizSet.material_id == material.id))
        ).delete(synchronize_session=False)
        db.query(QuizSet).filter(QuizSet.material_id == material.id).delete(synchronize_session=False)
        quiz_set = QuizSet(
            user_id=material.owner_user_id,
            course_id=material.course_id,
            topic_id=material.topic_id,
            material_id=material.id,
            title=f"{material.title} Quiz",
            difficulty="medium",
            question_count=len(quiz_result.questions),
            metadata_json={"generated_from_pipeline": True},
        )
        db.add(quiz_set)
        db.flush()
        for index, question in enumerate(quiz_result.questions):
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

        material.processing_stage = ProcessingStage.COMPLETED
        material.processing_status = ProcessingStatus.COMPLETED
        material.error_message = None
        job.stage = ProcessingStage.COMPLETED
        job.status = ProcessingStatus.COMPLETED
        job.finished_at = datetime.now(UTC)
        append_job_log(job, ProcessingStage.COMPLETED, "Material pipeline completed successfully.")
        db.commit()
    except Exception as exc:
        material = db.query(Material).filter(Material.id == material_id).first()
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if material:
            material.processing_stage = ProcessingStage.FAILED
            material.processing_status = ProcessingStatus.FAILED
            material.error_message = str(exc)
        if job:
            job.stage = ProcessingStage.FAILED
            job.status = ProcessingStatus.FAILED
            job.error_message = str(exc)
            job.finished_at = datetime.now(UTC)
            append_job_log(job, ProcessingStage.FAILED, f"Pipeline failed: {exc}")
        db.commit()
        raise
    finally:
        db.close()


def retry_processing_job(db: Session, *, job: ProcessingJob) -> ProcessingJob:
    job.status = ProcessingStatus.PENDING
    job.stage = ProcessingStage.UPLOADED
    job.error_message = None
    append_job_log(job, ProcessingStage.UPLOADED, "Job retry requested.")
    db.commit()
    return job
