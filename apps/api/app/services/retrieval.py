from __future__ import annotations

from math import sqrt
import re

from sqlalchemy.orm import Session

from app.models.entities import ChatThread, Material, MaterialChunk, User
from app.models.enums import ProcessingStatus
from app.providers.factory import get_embedding_provider

STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "what",
    "which",
    "with",
    "your",
}


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    numerator = sum(a * b for a, b in zip(left, right, strict=False))
    left_norm = sqrt(sum(value * value for value in left))
    right_norm = sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)


def _tokenize(text: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9]+", text.lower()) if len(token) > 2 and token not in STOPWORDS}


def _lexical_overlap(query_tokens: set[str], chunk: MaterialChunk) -> float:
    if not query_tokens:
        return 0.0
    chunk_tokens = _tokenize(chunk.text)
    if not chunk_tokens:
        return 0.0
    overlap = len(query_tokens & chunk_tokens)
    heading_tokens = _tokenize(chunk.section_heading or "")
    heading_overlap = len(query_tokens & heading_tokens)
    return min(1.0, (overlap / len(query_tokens)) + (0.15 if heading_overlap else 0.0))


def _score_chunk(chunk: MaterialChunk, query_vector: list[float], query_tokens: set[str]) -> float:
    semantic = _cosine_similarity(chunk.embedding or [0.0] * len(query_vector), query_vector)
    lexical = _lexical_overlap(query_tokens, chunk)
    source_bonus = 0.05 if chunk.page_number or chunk.slide_number or chunk.start_second is not None else 0.0
    return (semantic * 0.68) + (lexical * 0.32) + source_bonus


def retrieve_relevant_chunks(
    db: Session,
    thread: ChatThread,
    query: str,
    user: User,
    top_k: int = 5,
) -> list[MaterialChunk]:
    provider = get_embedding_provider()
    query_vector = provider.embed_texts([query])[0]
    query_tokens = _tokenize(query)
    material_scope = db.query(Material.id).filter(Material.deleted_at.is_(None))
    material_scope = material_scope.filter(Material.processing_status == ProcessingStatus.COMPLETED)
    if user.role.value not in {"admin", "moderator"}:
        material_scope = material_scope.filter(Material.owner_user_id == user.id)
    if thread.material_id:
        material_scope = material_scope.filter(Material.id == thread.material_id)
    elif thread.topic_id:
        material_scope = material_scope.filter(Material.topic_id == thread.topic_id)
    elif thread.course_id:
        material_scope = material_scope.filter(Material.course_id == thread.course_id)
    material_ids = [material_id for (material_id,) in material_scope.limit(250).all()]
    if not material_ids:
        return []
    chunks = (
        db.query(MaterialChunk)
        .filter(MaterialChunk.material_id.in_(material_ids), MaterialChunk.deleted_at.is_(None))
        .limit(250)
        .all()
    )
    scored = [(chunk, _score_chunk(chunk, query_vector, query_tokens)) for chunk in chunks]
    scored.sort(key=lambda item: item[1], reverse=True)
    return [item[0] for item in scored[:top_k]]
