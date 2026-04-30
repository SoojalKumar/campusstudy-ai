from __future__ import annotations

from math import sqrt

from sqlalchemy.orm import Session

from app.models.entities import ChatThread, Material, MaterialChunk, User
from app.providers.factory import get_embedding_provider


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    numerator = sum(a * b for a, b in zip(left, right, strict=False))
    left_norm = sqrt(sum(value * value for value in left))
    right_norm = sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)


def retrieve_relevant_chunks(
    db: Session,
    thread: ChatThread,
    query: str,
    user: User,
    top_k: int = 5,
) -> list[MaterialChunk]:
    provider = get_embedding_provider()
    query_vector = provider.embed_texts([query])[0]
    base_query = db.query(MaterialChunk)
    material_scope = db.query(Material.id).filter(Material.deleted_at.is_(None))
    if user.role.value not in {"admin", "moderator"}:
        material_scope = material_scope.filter(Material.owner_user_id == user.id)
    if thread.material_id:
        material_scope = material_scope.filter(Material.id == thread.material_id)
    elif thread.topic_id:
        material_scope = material_scope.filter(Material.topic_id == thread.topic_id)
    elif thread.course_id:
        material_scope = material_scope.filter(Material.course_id == thread.course_id)
    base_query = base_query.filter(
        MaterialChunk.material_id.in_(material_scope.subquery()),
        MaterialChunk.deleted_at.is_(None),
    )

    chunks = base_query.limit(250).all()
    scored = [
        (chunk, _cosine_similarity(chunk.embedding or [0.0] * len(query_vector), query_vector))
        for chunk in chunks
    ]
    scored.sort(key=lambda item: item[1], reverse=True)
    return [item[0] for item in scored[:top_k]]
