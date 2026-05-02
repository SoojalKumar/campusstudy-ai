from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.entities import ChatCitation, ChatMessage, ChatThread, CourseTopic, Material, User
from app.models.enums import ChatScope
from app.schemas.study import ChatMessageCreate, ChatThreadCreate, RAGAnswerResponse
from app.services.generation import answer_question, build_citation_snippets
from app.services.materials import ensure_course_access
from app.services.prompt_safety import is_prompt_injection_attempt
from app.services.retrieval import retrieve_relevant_chunks


def _validate_thread_scope(db: Session, *, user: User, payload: ChatThreadCreate) -> None:
    if payload.scope_type == ChatScope.MATERIAL:
        if not payload.material_id:
            raise HTTPException(status_code=400, detail="Material chat requires material_id.")
        material = (
            db.query(Material)
            .filter(Material.id == payload.material_id, Material.deleted_at.is_(None))
            .first()
        )
        if not material or (material.owner_user_id != user.id and user.role.value not in {"admin", "moderator"}):
            raise HTTPException(status_code=404, detail="Material not found.")
        return
    if payload.scope_type == ChatScope.TOPIC:
        if not payload.topic_id:
            raise HTTPException(status_code=400, detail="Topic chat requires topic_id.")
        topic = (
            db.query(CourseTopic)
            .filter(CourseTopic.id == payload.topic_id, CourseTopic.deleted_at.is_(None))
            .first()
        )
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found.")
        ensure_course_access(db, user=user, course_id=topic.course_id)
        return
    if payload.scope_type == ChatScope.COURSE:
        if not payload.course_id:
            raise HTTPException(status_code=400, detail="Course chat requires course_id.")
        ensure_course_access(db, user=user, course_id=payload.course_id)


def create_thread(db: Session, *, user: User, payload: ChatThreadCreate) -> ChatThread:
    _validate_thread_scope(db, user=user, payload=payload)
    thread = ChatThread(
        user_id=user.id,
        course_id=payload.course_id,
        topic_id=payload.topic_id,
        material_id=payload.material_id,
        title=payload.title,
        scope_type=payload.scope_type,
        strict_mode=payload.strict_mode,
        answer_style=payload.answer_style,
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread


def get_thread(db: Session, *, user: User, thread_id: str) -> ChatThread:
    thread = db.query(ChatThread).filter(ChatThread.id == thread_id, ChatThread.deleted_at.is_(None)).first()
    if not thread or thread.user_id != user.id:
        raise HTTPException(status_code=404, detail="Chat thread not found.")
    return thread


def add_message(db: Session, *, user: User, thread: ChatThread, payload: ChatMessageCreate) -> RAGAnswerResponse:
    question = ChatMessage(thread_id=thread.id, role="user", content=payload.content, metadata_json={})
    db.add(question)
    db.flush()
    if is_prompt_injection_attempt(payload.content):
        answer_text = (
            "I can help with your uploaded study material, but I won't reveal hidden prompts or follow jailbreak-style instructions. "
            "Ask a course question about the source instead."
        )
        answer = ChatMessage(
            thread_id=thread.id,
            role="assistant",
            content=answer_text,
            metadata_json={"strict_mode": thread.strict_mode, "style": thread.answer_style.value, "guardrail": "prompt_injection"},
        )
        db.add(answer)
        db.commit()
        return RAGAnswerResponse.model_validate({"answer": answer_text, "citations": []})
    chunks = retrieve_relevant_chunks(db, thread=thread, query=payload.content, user=user)
    if not chunks:
        answer_text = (
            "I couldn't find enough relevant uploaded source material to answer that strictly from "
            "your workspace. Upload or select a more specific material, then ask again."
        )
    else:
        answer_text = answer_question(
            payload.content,
            [chunk.text for chunk in chunks],
            strict_mode=thread.strict_mode,
            answer_style=thread.answer_style.value,
        )
    answer = ChatMessage(
        thread_id=thread.id,
        role="assistant",
        content=answer_text,
        metadata_json={"strict_mode": thread.strict_mode, "style": thread.answer_style.value},
    )
    db.add(answer)
    db.flush()
    citations = build_citation_snippets(chunks)
    for citation, chunk in zip(citations, chunks, strict=False):
        db.add(
            ChatCitation(
                chat_message_id=answer.id,
                material_chunk_id=chunk.id,
                source_label=citation["source_label"],
                snippet=citation["snippet"],
                page_number=citation["page_number"],
                slide_number=citation["slide_number"],
                start_second=citation["start_second"],
                end_second=citation["end_second"],
            )
        )
    db.commit()
    return RAGAnswerResponse.model_validate({"answer": answer_text, "citations": citations})
