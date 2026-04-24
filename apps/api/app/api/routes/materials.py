from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.entities import MaterialChunk
from app.providers.storage import get_storage_backend
from app.schemas.material import MaterialChunkResponse, MaterialResponse
from app.services.materials import (
    archive_material,
    create_material_upload,
    get_owned_material,
    list_accessible_materials,
)

router = APIRouter()


@router.get("", response_model=list[MaterialResponse])
def list_materials(
    course_id: str | None = None,
    topic_id: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> list[MaterialResponse]:
    materials = list_accessible_materials(db, user=user, course_id=course_id, topic_id=topic_id)
    storage = get_storage_backend()
    return [
        MaterialResponse.model_validate({**material.__dict__, "download_url": storage.presigned_url(material.storage_key)})
        for material in materials
    ]


@router.post("/upload", response_model=MaterialResponse)
def upload_material(
    course_id: str = Form(...),
    title: str = Form(...),
    topic_id: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> MaterialResponse:
    material = create_material_upload(
        db,
        user=user,
        course_id=course_id,
        topic_id=topic_id,
        title=title,
        file=file,
    )
    payload = MaterialResponse.model_validate(material)
    payload.download_url = get_storage_backend().presigned_url(material.storage_key)
    return payload


@router.get("/{material_id}", response_model=MaterialResponse)
def get_material(material_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)) -> MaterialResponse:
    material = get_owned_material(db, user=user, material_id=material_id)
    payload = MaterialResponse.model_validate(material)
    payload.download_url = get_storage_backend().presigned_url(material.storage_key)
    return payload


@router.get("/{material_id}/status", response_model=MaterialResponse)
def get_material_status(
    material_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)
) -> MaterialResponse:
    return get_material(material_id=material_id, db=db, user=user)


@router.get("/{material_id}/chunks", response_model=list[MaterialChunkResponse])
def get_material_chunks(
    material_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)
) -> list[MaterialChunk]:
    get_owned_material(db, user=user, material_id=material_id)
    return (
        db.query(MaterialChunk)
        .filter(MaterialChunk.material_id == material_id, MaterialChunk.deleted_at.is_(None))
        .order_by(MaterialChunk.chunk_index.asc())
        .all()
    )


@router.delete("/{material_id}")
def delete_material(material_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)) -> dict:
    archive_material(db, user=user, material_id=material_id)
    return {"message": "Material archived."}
