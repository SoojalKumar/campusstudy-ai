from app.services.chunking import chunk_sections
from app.services.extraction import ExtractedSection


def test_chunk_sections_preserves_page_metadata():
    text = " ".join(["graph"] * 250)
    chunks = chunk_sections([ExtractedSection(text=text, page_number=3, section_heading="Traversal")], max_words=100)
    assert len(chunks) == 3
    assert all(chunk.page_number == 3 for chunk in chunks)
    assert chunks[0].section_heading == "Traversal"

