from datetime import datetime
from typing import Any

from app.schemas.common import TimestampsMixin


class MaterialResponse(TimestampsMixin):
    owner_user_id: str
    course_id: str
    topic_id: str | None
    title: str
    file_name: str
    file_type: str
    mime_type: str
    size_bytes: int
    storage_key: str
    preview_image_url: str | None
    source_kind: str
    processing_stage: str
    processing_status: str
    error_message: str | None
    extracted_text: str | None
    transcript_text: str | None
    source_metadata: dict[str, Any]
    download_url: str | None = None


class MaterialChunkResponse(TimestampsMixin):
    material_id: str
    chunk_index: int
    text: str
    token_count: int
    page_number: int | None
    slide_number: int | None
    section_heading: str | None
    start_second: int | None
    end_second: int | None
    metadata_json: dict[str, Any]


class ProcessingJobResponse(TimestampsMixin):
    material_id: str
    task_name: str
    status: str
    stage: str
    attempts: int
    error_message: str | None
    logs_json: list[dict[str, Any]]
    started_at: datetime | None
    finished_at: datetime | None


class TranscriptSegmentResponse(TimestampsMixin):
    material_id: str
    start_second: int
    end_second: int
    speaker_label: str | None
    language: str | None
    text: str
    translated_text: str | None
