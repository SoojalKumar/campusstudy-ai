from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
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


def serialize_material(material, request: Request) -> MaterialResponse:
    payload = MaterialResponse.model_validate(material)
    payload.download_url = str(request.url_for("download_material", material_id=material.id))
    return payload


def content_disposition(filename: str, disposition: str) -> str:
    return f"{disposition}; filename*=UTF-8''{quote(filename)}"


@router.get("", response_model=list[MaterialResponse])
def list_materials(
    request: Request,
    course_id: str | None = None,
    topic_id: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> list[MaterialResponse]:
    materials = list_accessible_materials(db, user=user, course_id=course_id, topic_id=topic_id)
    return [serialize_material(material, request) for material in materials]


@router.get("/{material_id}/download", name="download_material")
def download_material(
    material_id: str,
    request: Request,
    disposition: str = "attachment",
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> Response:
    if disposition not in {"attachment", "inline"}:
        raise HTTPException(status_code=400, detail="Disposition must be either 'attachment' or 'inline'.")
    material = get_owned_material(db, user=user, material_id=material_id)
    try:
        content = get_storage_backend().load_bytes(material.storage_key)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Stored file not found.") from exc
    return Response(
        content=content,
        media_type=material.mime_type,
        headers={
            "Content-Disposition": content_disposition(material.file_name, disposition),
            "Cache-Control": "no-store",
            "X-Request-ID": request.state.request_id if hasattr(request.state, "request_id") else "",
        },
    )


@router.post("/upload", response_model=MaterialResponse)
def upload_material(
    request: Request,
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
    return serialize_material(material, request)


@router.get("/{material_id}", response_model=MaterialResponse)
def get_material(
    material_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> MaterialResponse:
    material = get_owned_material(db, user=user, material_id=material_id)
    return serialize_material(material, request)


@router.get("/{material_id}/status", response_model=MaterialResponse)
def get_material_status(
    material_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> MaterialResponse:
    return get_material(material_id=material_id, request=request, db=db, user=user)


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
