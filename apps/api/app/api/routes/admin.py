from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_role
from app.models.entities import Material, ProcessingJob, User
from app.schemas.admin import AdminMetricsResponse
from app.schemas.material import MaterialResponse, ProcessingJobResponse
from app.schemas.auth import UserResponse
from app.services.admin import admin_metrics, disable_user
from app.services.auth import serialize_user
from app.services.processing import enqueue_processing_job, retry_processing_job
from app.workers.tasks import process_material_pipeline

router = APIRouter()


class DisableUserRequest(BaseModel):
    reason: str | None = None


@router.get("/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), admin=Depends(require_role("admin"))) -> list[UserResponse]:
    return [serialize_user(user) for user in db.query(User).order_by(User.created_at.desc()).all()]


@router.get("/materials", response_model=list[MaterialResponse])
def list_materials(db: Session = Depends(get_db), admin=Depends(require_role("admin", "moderator"))) -> list[Material]:
    return db.query(Material).order_by(Material.created_at.desc()).limit(100).all()


@router.get("/jobs", response_model=list[ProcessingJobResponse])
def list_admin_jobs(
    db: Session = Depends(get_db), admin=Depends(require_role("admin", "moderator"))
) -> list[ProcessingJob]:
    return db.query(ProcessingJob).order_by(ProcessingJob.created_at.desc()).limit(100).all()


@router.post("/users/{user_id}/disable", response_model=UserResponse)
def disable_user_endpoint(
    user_id: str,
    payload: DisableUserRequest,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin")),
) -> UserResponse:
    user = disable_user(db, admin_user=admin, user_id=user_id, reason=payload.reason)
    return serialize_user(user)


@router.post("/jobs/{job_id}/retry", response_model=ProcessingJobResponse)
def retry_admin_job(
    job_id: str,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin", "moderator")),
) -> ProcessingJob:
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    retry_processing_job(db, job=job)
    material = db.query(Material).filter(Material.id == job.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found.")
    enqueue_processing_job(db, material=material, job=job, task=process_material_pipeline)
    return job


@router.get("/metrics", response_model=AdminMetricsResponse)
def metrics(db: Session = Depends(get_db), admin=Depends(require_role("admin", "moderator"))) -> AdminMetricsResponse:
    return admin_metrics(db)
