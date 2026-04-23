from __future__ import annotations

from dataclasses import dataclass

from app.services.extraction import ExtractedSection


@dataclass
class ChunkDraft:
    chunk_index: int
    text: str
    token_count: int
    page_number: int | None = None
    slide_number: int | None = None
    section_heading: str | None = None
    start_second: int | None = None
    end_second: int | None = None


def chunk_sections(sections: list[ExtractedSection], max_words: int = 180) -> list[ChunkDraft]:
    chunks: list[ChunkDraft] = []
    chunk_index = 0
    for section in sections:
        words = section.text.split()
        if not words:
            continue
        for start in range(0, len(words), max_words):
            piece = words[start : start + max_words]
            chunks.append(
                ChunkDraft(
                    chunk_index=chunk_index,
                    text=" ".join(piece),
                    token_count=len(piece),
                    page_number=section.page_number,
                    slide_number=section.slide_number,
                    section_heading=section.section_heading,
                    start_second=section.start_second,
                    end_second=section.end_second,
                )
            )
            chunk_index += 1
    return chunks

