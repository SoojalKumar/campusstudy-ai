from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


@dataclass
class TranscriptionSegment:
    start_second: int
    end_second: int
    text: str
    language: str = "en"
    speaker_label: str | None = None


class LLMProvider(Protocol):
    def generate_structured(self, *, prompt: str, schema: type[T]) -> T: ...

    def answer_with_context(self, *, prompt: str, context: list[str]) -> str: ...


class EmbeddingProvider(Protocol):
    def embed_texts(self, texts: list[str]) -> list[list[float]]: ...


class SpeechToTextProvider(Protocol):
    def transcribe(self, file_path: Path) -> list[TranscriptionSegment]: ...


class StorageBackend(Protocol):
    def save_bytes(self, *, key: str, content: bytes, content_type: str) -> str: ...

    def load_bytes(self, key: str) -> bytes: ...

    def delete(self, key: str) -> None: ...

    def presigned_url(self, key: str) -> str: ...
