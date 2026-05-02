from app.models.entities import MaterialChunk
from app.services.citations import format_source_label


def test_format_source_label_prefers_page_then_slide_then_time():
    page_chunk = MaterialChunk(material_id="m1", chunk_index=0, text="text", token_count=5, page_number=8)
    slide_chunk = MaterialChunk(material_id="m1", chunk_index=1, text="text", token_count=5, slide_number=4)
    transcript_chunk = MaterialChunk(
        material_id="m1",
        chunk_index=2,
        text="text",
        token_count=5,
        start_second=12,
        end_second=34,
    )
    assert format_source_label(page_chunk) == "Page 8"
    assert format_source_label(slide_chunk) == "Slide 4"
    assert format_source_label(transcript_chunk) == "0:12-0:34"
