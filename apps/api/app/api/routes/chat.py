from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import enforce_rate_limit, get_current_user, get_db
from app.models.entities import ChatCitation, ChatMessage, ChatThread
from app.schemas.study import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatThreadCreate,
    ChatThreadResponse,
    CitationResponse,
    RAGAnswerResponse,
)
from app.services.chat import add_message, create_thread, get_thread

router = APIRouter()


@router.post("/threads", response_model=ChatThreadResponse)
def create_chat_thread(
    payload: ChatThreadCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> ChatThreadResponse:
    thread = create_thread(db, user=user, payload=payload)
    return get_chat_thread(thread.id, db=db, user=user)


@router.get("/threads", response_model=list[ChatThreadResponse])
def list_chat_threads(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> list[ChatThreadResponse]:
    threads = (
        db.query(ChatThread)
        .filter(ChatThread.user_id == user.id, ChatThread.deleted_at.is_(None))
        .order_by(ChatThread.updated_at.desc())
        .limit(25)
        .all()
    )
    return [ChatThreadResponse.model_validate(thread) for thread in threads]


@router.get("/threads/{thread_id}", response_model=ChatThreadResponse)
def get_chat_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> ChatThreadResponse:
    thread = get_thread(db, user=user, thread_id=thread_id)
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    message_responses: list[ChatMessageResponse] = []
    for message in messages:
        citations = (
            db.query(ChatCitation)
            .filter(ChatCitation.chat_message_id == message.id)
            .order_by(ChatCitation.created_at.asc())
            .all()
        )
        message_responses.append(
            ChatMessageResponse(
                **ChatMessageResponse.model_validate(message).model_dump(exclude={"citations"}),
                citations=[
                    CitationResponse.model_validate(
                        {
                            **citation.__dict__,
                            "chunk_id": citation.material_chunk_id,
                        }
                    )
                    for citation in citations
                ],
            )
        )
    return ChatThreadResponse(
        **ChatThreadResponse.model_validate(thread).model_dump(exclude={"messages"}),
        messages=message_responses,
    )


@router.post(
    "/threads/{thread_id}/messages",
    response_model=RAGAnswerResponse,
    dependencies=[Depends(enforce_rate_limit)],
)
def post_chat_message(
    thread_id: str,
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> RAGAnswerResponse:
    thread = get_thread(db, user=user, thread_id=thread_id)
    return add_message(db, user=user, thread=thread, payload=payload)
