from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.entities import AdminAction, Course, Material, ProcessingJob, User
from app.models.enums import ProcessingStatus
from app.schemas.admin import AdminMetricsResponse


def disable_user(db: Session, *, admin_user: User, user_id: str, reason: str | None = None) -> User:
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = False
    db.add(
        AdminAction(
            admin_user_id=admin_user.id,
            action="user.disabled",
            target_type="user",
            target_id=user.id,
            reason=reason,
            metadata_json={"email": user.email},
        )
    )
    db.commit()
    db.refresh(user)
    return user


def admin_metrics(db: Session) -> AdminMetricsResponse:
    return AdminMetricsResponse(
        total_users=db.query(func.count(User.id)).scalar() or 0,
        total_courses=db.query(func.count(Course.id)).scalar() or 0,
        total_materials=db.query(func.count(Material.id)).scalar() or 0,
        failed_jobs=db.query(func.count(ProcessingJob.id))
        .filter(ProcessingJob.status == ProcessingStatus.FAILED)
        .scalar()
        or 0,
        active_students=db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0,
    )

