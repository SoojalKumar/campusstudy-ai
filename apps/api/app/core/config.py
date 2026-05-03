from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../../.env", "../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "CampusStudy AI API"
    api_prefix: str = "/api/v1"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 24
    password_bcrypt_rounds: int = 12
    allowed_email_domains: str = "student.pacific.edu,pacific.edu"
    max_upload_size_mb: int = 250
    rate_limit_requests_per_minute: int = 60

    database_url: str = "sqlite:///./campusstudy.db"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    file_storage_backend: Literal["s3", "local"] = "local"
    local_storage_path: str = "./uploads"
    s3_endpoint_url: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_bucket: str = "campusstudy-ai"
    s3_region: str = "us-east-1"

    llm_provider: Literal["mock", "meta_llama"] = "mock"
    llama_api_base_url: str = "https://api.llama.com/compat/v1"
    llama_api_key: str | None = None
    llm_model: str = "llama-4-scout"
    enable_mock_ai: bool = True
    allow_mock_ai_in_production: bool = False

    embedding_provider: Literal["mock"] = "mock"
    embedding_dimensions: int = 16

    stt_provider: Literal["mock"] = "mock"

    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:19006"]
    )
    environment: Literal["development", "test", "production"] = "development"
    request_id_header: str = "X-Request-ID"
    auto_create_schema: bool = False

    @property
    def allowed_domains(self) -> set[str]:
        return {domain.strip().lower() for domain in self.allowed_email_domains.split(",") if domain}

    def validate_production_ready(self) -> None:
        if self.environment != "production":
            return
        errors: list[str] = []
        if self.secret_key in {"change-me", "change-me-in-dev"} or len(self.secret_key) < 32:
            errors.append("SECRET_KEY must be a unique production secret with at least 32 characters.")
        if self.enable_mock_ai and not self.allow_mock_ai_in_production:
            errors.append("ENABLE_MOCK_AI must be false in production unless ALLOW_MOCK_AI_IN_PRODUCTION=true.")
        if self.llm_provider == "meta_llama" and not self.enable_mock_ai and not self.llama_api_key:
            errors.append("LLAMA_API_KEY is required when LLM_PROVIDER=meta_llama and mock AI is disabled.")
        if errors:
            raise RuntimeError("Production settings are not safe: " + " ".join(errors))


@lru_cache
def get_settings() -> Settings:
    return Settings()
