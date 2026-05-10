from __future__ import annotations

import json
import re

import httpx
from pydantic import BaseModel

from app.core.config import get_settings
from app.providers.base import LLMProvider

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqProvider(LLMProvider):
    """Groq chat-completions provider behind the shared LLM interface."""

    def __init__(self) -> None:
        self.settings = get_settings()
        if not self.settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is required when LLM_PROVIDER=groq.")

    def _chat(self, *, system: str, user: str, response_format: dict | None = None) -> str:
        payload = {
            "model": self.settings.groq_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
        }
        if response_format:
            payload["response_format"] = response_format
        with httpx.Client(timeout=60) as client:
            response = client.post(
                GROQ_CHAT_COMPLETIONS_URL,
                headers={
                    "Authorization": f"Bearer {self.settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
        return data["choices"][0]["message"]["content"]

    def generate_structured(self, *, prompt: str, schema: type[BaseModel]):
        schema_json = json.dumps(schema.model_json_schema(), ensure_ascii=True)
        raw = self._chat(
            system=(
                "Return only valid JSON. Do not wrap it in markdown. "
                "The response must match this JSON schema exactly:\n"
                f"{schema_json}"
            ),
            user=prompt,
            response_format={"type": "json_object"},
        )
        return schema.model_validate_json(_extract_json(raw))

    def answer_with_context(self, *, prompt: str, context: list[str]) -> str:
        context_block = "\n\n".join(f"Source {index + 1}:\n{snippet}" for index, snippet in enumerate(context))
        return self._chat(
            system=(
                "You are CampusStudy AI. Answer using only the provided study context. "
                "Be concise, cite source numbers inline when useful, and refuse if the context is insufficient."
            ),
            user=f"Context:\n{context_block}\n\nQuestion:\n{prompt}",
        )


def _extract_json(raw: str) -> str:
    stripped = raw.strip()
    fenced = re.match(r"^```(?:json)?\s*(.*?)\s*```$", stripped, re.DOTALL)
    return fenced.group(1).strip() if fenced else stripped
