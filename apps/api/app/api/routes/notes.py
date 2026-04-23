from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, enforce_rate_limit
from app.models.entities import NoteSet
from app.schemas.study import NoteGenerationRequest, NoteSetResponse
from app.services.study import generate_notes

router = APIRouter()


@router.post("/generate", response_model=NoteSetResponse, dependencies=[Depends(enforce_rate_limit)])
def generate_note_set(
    payload: NoteGenerationRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> NoteSet:
    return generate_notes(db, user=user, payload=payload)


@router.get("/by-material/{material_id}", response_model=list[NoteSetResponse])
def notes_by_material(material_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)) -> list[NoteSet]:
    return (
        db.query(NoteSet)
        .filter(NoteSet.material_id == material_id, NoteSet.user_id == user.id, NoteSet.deleted_at.is_(None))
        .order_by(NoteSet.created_at.desc())
        .all()
    )


@router.get("/by-course/{course_id}", response_model=list[NoteSetResponse])
def notes_by_course(course_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)) -> list[NoteSet]:
    return (
        db.query(NoteSet)
        .filter(NoteSet.course_id == course_id, NoteSet.user_id == user.id, NoteSet.deleted_at.is_(None))
        .order_by(NoteSet.created_at.desc())
        .all()
    )

