from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.entities import TranscriptSegment
from app.schemas.material import TranscriptSegmentResponse
from app.services.materials import get_owned_material

router = APIRouter()


@router.get("/materials/{material_id}/transcript", response_model=list[TranscriptSegmentResponse])
def get_material_transcript(
    material_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)
) -> list[TranscriptSegment]:
    get_owned_material(db, user=user, material_id=material_id)
    return (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.material_id == material_id, TranscriptSegment.deleted_at.is_(None))
        .order_by(TranscriptSegment.start_second.asc())
        .all()
    )


@router.get("/segments/{segment_id}", response_model=TranscriptSegmentResponse)
def get_segment(segment_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)) -> TranscriptSegment:
    segment = db.query(TranscriptSegment).filter(TranscriptSegment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Transcript segment not found.")
    get_owned_material(db, user=user, material_id=segment.material_id)
    return segment

