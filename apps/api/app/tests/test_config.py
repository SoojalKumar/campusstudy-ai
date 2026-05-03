import pytest

from app.core.config import Settings


def test_production_rejects_unsafe_default_secret():
    settings = Settings(environment="production", secret_key="change-me", enable_mock_ai=False)

    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        settings.validate_production_ready()


def test_production_rejects_mock_ai_without_explicit_override():
    settings = Settings(
        environment="production",
        secret_key="x" * 32,
        enable_mock_ai=True,
        allow_mock_ai_in_production=False,
    )

    with pytest.raises(RuntimeError, match="ENABLE_MOCK_AI"):
        settings.validate_production_ready()


def test_production_allows_explicit_mock_ai_override():
    settings = Settings(
        environment="production",
        secret_key="x" * 32,
        enable_mock_ai=True,
        allow_mock_ai_in_production=True,
    )

    settings.validate_production_ready()


def test_production_requires_llama_key_when_meta_provider_is_live():
    settings = Settings(
        environment="production",
        secret_key="x" * 32,
        enable_mock_ai=False,
        llm_provider="meta_llama",
        llama_api_key=None,
    )

    with pytest.raises(RuntimeError, match="LLAMA_API_KEY"):
        settings.validate_production_ready()


def test_development_keeps_local_mock_defaults_easy():
    settings = Settings(environment="development", secret_key="change-me", enable_mock_ai=True)

    settings.validate_production_ready()
