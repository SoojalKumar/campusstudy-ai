from __future__ import annotations

import json

import httpx
from pydantic import BaseModel

from app.core.config import get_settings
from app.providers.base import LLMProvider


class MetaLlamaProvider(LLMProvider):
    """
    Uses a Meta Llama-compatible chat-completions endpoint.

    The exact API surface can be supplied via env vars, so the provider remains portable
    across managed and self-hosted deployments that expose a compatible interface.
    """

    def __init__(self) -> None:
        self.settings = get_settings()

    def _request_json(self, prompt: str) -> str:
        if not self.settings.llama_api_key:
            raise RuntimeError("LLAMA_API_KEY is not configured.")
        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"{self.settings.llama_api_base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {self.settings.llama_api_key}"},
                json={
                    "model": self.settings.llm_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "Return only valid JSON that matches the requested schema.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.2,
                },
            )
            response.raise_for_status()
            data = response.json()
        return data["choices"][0]["message"]["content"]

    def generate_structured(self, *, prompt: str, schema: type[BaseModel]):
        raw = self._request_json(prompt)
        return schema.model_validate_json(raw)

    def answer_with_context(self, *, prompt: str, context: list[str]) -> str:
        body = json.dumps({"question": prompt, "context": context}, ensure_ascii=True)
        return self._request_json(body)

