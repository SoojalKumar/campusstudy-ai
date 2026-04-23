from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.entities import CourseTopic
from app.schemas.course import TopicResponse

router = APIRouter()


@router.get("", response_model=list[TopicResponse])
def list_topics(
    course_id: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> list[CourseTopic]:
    query = db.query(CourseTopic).filter(CourseTopic.deleted_at.is_(None))
    if course_id:
        query = query.filter(CourseTopic.course_id == course_id)
    return query.order_by(CourseTopic.title.asc()).all()

