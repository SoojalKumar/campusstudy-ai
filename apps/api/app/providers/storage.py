from __future__ import annotations

from pathlib import Path

import boto3

from app.core.config import get_settings
from app.providers.base import StorageBackend


class LocalStorageBackend(StorageBackend):
    def __init__(self) -> None:
        self.settings = get_settings()
        self.root = Path(self.settings.local_storage_path)
        self.root.mkdir(parents=True, exist_ok=True)

    def save_bytes(self, *, key: str, content: bytes, content_type: str) -> str:
        path = self.root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return key

    def load_bytes(self, key: str) -> bytes:
        return (self.root / key).read_bytes()

    def delete(self, key: str) -> None:
        path = self.root / key
        if path.exists():
            path.unlink()

    def presigned_url(self, key: str) -> str:
        return f"/local-storage/{key}"


class S3StorageBackend(StorageBackend):
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = boto3.client(
            "s3",
            endpoint_url=self.settings.s3_endpoint_url,
            aws_access_key_id=self.settings.s3_access_key,
            aws_secret_access_key=self.settings.s3_secret_key,
            region_name=self.settings.s3_region,
        )
        try:
            self.client.head_bucket(Bucket=self.settings.s3_bucket)
        except Exception:
            self.client.create_bucket(Bucket=self.settings.s3_bucket)

    def save_bytes(self, *, key: str, content: bytes, content_type: str) -> str:
        self.client.put_object(
            Bucket=self.settings.s3_bucket, Key=key, Body=content, ContentType=content_type
        )
        return key

    def load_bytes(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.settings.s3_bucket, Key=key)
        return response["Body"].read()

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.settings.s3_bucket, Key=key)

    def presigned_url(self, key: str) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.settings.s3_bucket, "Key": key},
            ExpiresIn=3600,
        )


def get_storage_backend() -> StorageBackend:
    settings = get_settings()
    if settings.file_storage_backend == "s3":
        return S3StorageBackend()
    return LocalStorageBackend()
