from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import AuditLog, Course, Enrollment, Material, MaterialVersion, ProcessingJob, User
from app.models.enums import ProcessingStage, ProcessingStatus
from app.providers.storage import get_storage_backend
from app.services.antivirus import scan_file
from app.services.extraction import detect_material_kind
from app.workers.tasks import process_material_pipeline


def ensure_course_access(db: Session, *, user: User, course_id: str) -> Course:
    course = db.query(Course).filter(Course.id == course_id, Course.deleted_at.is_(None)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    if user.role.value != "admin":
        enrollment = (
            db.query(Enrollment)
            .filter(Enrollment.user_id == user.id, Enrollment.course_id == course_id, Enrollment.deleted_at.is_(None))
            .first()
        )
        if not enrollment:
            raise HTTPException(status_code=403, detail="You are not enrolled in this course.")
    return course


def create_material_upload(
    db: Session,
    *,
    user: User,
    course_id: str,
    topic_id: str | None,
    title: str,
    file: UploadFile,
) -> Material:
    settings = get_settings()
    ensure_course_access(db, user=user, course_id=course_id)
    content = file.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds the {settings.max_upload_size_mb}MB limit.")

    checksum = hashlib.sha256(content).hexdigest()
    extension = Path(file.filename or "upload").suffix.lower()
    allowed_extensions = {
        ".pdf",
        ".ppt",
        ".pptx",
        ".doc",
        ".docx",
        ".txt",
        ".md",
        ".mp3",
        ".wav",
        ".m4a",
        ".aac",
        ".mp4",
        ".mov",
        ".mkv",
    }
    if extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {extension or 'unknown'}")
    kind = detect_material_kind(file.filename or title, file.content_type or "application/octet-stream")
    storage_key = f"{user.id}/{checksum}{extension}"

    with NamedTemporaryFile(delete=True, suffix=extension) as temp_file:
        temp_file.write(content)
        temp_file.flush()
        scan_file(Path(temp_file.name))

    storage = get_storage_backend()
    storage.save_bytes(
        key=storage_key,
        content=content,
        content_type=file.content_type or "application/octet-stream",
    )

    material = Material(
        owner_user_id=user.id,
        course_id=course_id,
        topic_id=topic_id,
        title=title,
        file_name=file.filename or f"{title}{extension}",
        file_type=extension.replace(".", "") or "bin",
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        storage_key=storage_key,
        source_kind=kind,
        processing_stage=ProcessingStage.UPLOADED,
        processing_status=ProcessingStatus.PENDING,
        checksum=checksum,
        source_metadata={"original_filename": file.filename},
    )
    db.add(material)
    db.flush()

    version = MaterialVersion(
        material_id=material.id,
        version_number=1,
        storage_key=storage_key,
        source_metadata={"checksum": checksum},
    )
    job = ProcessingJob(
        material_id=material.id,
        task_name="process_material_pipeline",
        status=ProcessingStatus.PENDING,
        stage=ProcessingStage.UPLOADED,
        logs_json=[{"stage": ProcessingStage.UPLOADED.value, "message": "Material uploaded."}],
    )
    db.add_all(
        [
            version,
            job,
            AuditLog(
                actor_user_id=user.id,
                action="material.uploaded",
                target_type="material",
                target_id=material.id,
                metadata_json={"course_id": course_id, "topic_id": topic_id, "file_name": material.file_name},
            ),
        ]
    )
    db.commit()
    db.refresh(material)

    try:
        process_material_pipeline.delay(material.id, job.id)
    except Exception:
        pass
    return material


def get_owned_material(db: Session, *, user: User, material_id: str) -> Material:
    material = db.query(Material).filter(Material.id == material_id, Material.deleted_at.is_(None)).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found.")
    if material.owner_user_id != user.id and user.role.value not in {"admin", "moderator"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
    return material


def archive_material(db: Session, *, user: User, material_id: str) -> Material:
    material = get_owned_material(db, user=user, material_id=material_id)
    material.deleted_at = datetime.now(UTC)
    db.commit()
    db.refresh(material)
    return material


def list_accessible_materials(
    db: Session,
    *,
    user: User,
    course_id: str | None = None,
    topic_id: str | None = None,
) -> list[Material]:
    query = db.query(Material).filter(Material.deleted_at.is_(None))
    if user.role.value not in {"admin", "moderator"}:
        query = query.filter(Material.owner_user_id == user.id)
    if course_id:
        query = query.filter(Material.course_id == course_id)
    if topic_id:
        query = query.filter(Material.topic_id == topic_id)
    return query.order_by(Material.created_at.desc()).all()
