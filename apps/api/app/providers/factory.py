from app.core.config import get_settings
from app.providers.base import EmbeddingProvider, LLMProvider, SpeechToTextProvider
from app.providers.meta_llama import MetaLlamaProvider
from app.providers.mock import MockEmbeddingProvider, MockLLMProvider, MockSpeechToTextProvider


def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    if settings.llm_provider == "meta_llama" and not settings.enable_mock_ai:
        return MetaLlamaProvider()
    return MockLLMProvider()


def get_embedding_provider() -> EmbeddingProvider:
    settings = get_settings()
    return MockEmbeddingProvider(dimensions=settings.embedding_dimensions)


def get_stt_provider() -> SpeechToTextProvider:
    return MockSpeechToTextProvider()
