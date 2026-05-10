import pytest

from app.core.config import Settings
from app.providers.factory import get_llm_provider
from app.providers.groq import GroqProvider
from app.providers.mock import MockLLMProvider


def test_mock_provider_remains_default(monkeypatch):
    monkeypatch.setattr("app.providers.factory.get_settings", lambda: Settings())

    assert isinstance(get_llm_provider(), MockLLMProvider)


def test_enable_mock_ai_keeps_mock_provider_even_when_groq_is_configured(monkeypatch):
    settings = Settings(llm_provider="groq", enable_mock_ai=True)
    monkeypatch.setattr("app.providers.factory.get_settings", lambda: settings)

    assert isinstance(get_llm_provider(), MockLLMProvider)


def test_groq_provider_requires_key(monkeypatch):
    settings = Settings(llm_provider="groq", enable_mock_ai=False, groq_api_key=None)
    monkeypatch.setattr("app.providers.groq.get_settings", lambda: settings)

    with pytest.raises(RuntimeError, match="GROQ_API_KEY"):
        GroqProvider()


def test_groq_with_key_selects_groq_provider(monkeypatch):
    settings = Settings(llm_provider="groq", enable_mock_ai=False, groq_api_key="gsk_test_key")
    monkeypatch.setattr("app.providers.factory.get_settings", lambda: settings)
    monkeypatch.setattr("app.providers.groq.get_settings", lambda: settings)

    assert isinstance(get_llm_provider(), GroqProvider)
