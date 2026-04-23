from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.entities import ChatCitation, ChatMessage, ChatThread, User
from app.schemas.study import ChatMessageCreate, ChatThreadCreate, RAGAnswerResponse
from app.services.generation import answer_question, build_citation_snippets
from app.services.retrieval import retrieve_relevant_chunks


def create_thread(db: Session, *, user: User, payload: ChatThreadCreate) -> ChatThread:
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
    chunks = retrieve_relevant_chunks(db, thread=thread, query=payload.content)
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
