from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.entities import Enrollment
from app.schemas.course import EnrollmentResponse

router = APIRouter()


@router.get("", response_model=list[EnrollmentResponse])
def list_enrollments(db: Session = Depends(get_db), user=Depends(get_current_user)) -> list[Enrollment]:
    return (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user.id, Enrollment.deleted_at.is_(None))
        .order_by(Enrollment.created_at.desc())
        .all()
    )
