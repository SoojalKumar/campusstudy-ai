from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models.entities import University
from app.schemas.course import UniversityResponse

router = APIRouter()


@router.get("", response_model=list[UniversityResponse])
def list_universities(db: Session = Depends(get_db)) -> list[University]:
    return db.query(University).filter(University.deleted_at.is_(None)).order_by(University.name.asc()).all()

