from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_role
from app.models.entities import Material, ProcessingJob
from app.schemas.material import ProcessingJobResponse
from app.services.processing import retry_processing_job
from app.workers.tasks import process_material_pipeline

router = APIRouter()


@router.get("/jobs", response_model=list[ProcessingJobResponse])
def list_jobs(
    material_id: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> list[ProcessingJob]:
    query = db.query(ProcessingJob).join(Material, ProcessingJob.material_id == Material.id)
    if user.role.value not in {"admin", "moderator"}:
        query = query.filter(Material.owner_user_id == user.id)
    if material_id:
        query = query.filter(ProcessingJob.material_id == material_id)
    return query.filter(ProcessingJob.deleted_at.is_(None)).order_by(ProcessingJob.created_at.desc()).all()


@router.get("/jobs/{job_id}", response_model=ProcessingJobResponse)
def get_job(job_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)) -> ProcessingJob:
    job = (
        db.query(ProcessingJob)
        .join(Material, ProcessingJob.material_id == Material.id)
        .filter(ProcessingJob.id == job_id, ProcessingJob.deleted_at.is_(None))
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    material = db.query(Material).filter(Material.id == job.material_id).first()
    if material and material.owner_user_id != user.id and user.role.value not in {"admin", "moderator"}:
        raise HTTPException(status_code=403, detail="Forbidden.")
    return job


@router.post("/jobs/{job_id}/retry", response_model=ProcessingJobResponse)
def retry_job(
    job_id: str,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin", "moderator")),
) -> ProcessingJob:
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id, ProcessingJob.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    retry_processing_job(db, job=job)
    try:
        process_material_pipeline.delay(job.material_id, job.id)
    except Exception:
        pass
    return job
