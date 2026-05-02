from app.models.entities import MaterialChunk


def _format_seconds(total_seconds: int) -> str:
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:02d}"


def format_source_label(chunk: MaterialChunk) -> str:
    if chunk.page_number:
        return f"Page {chunk.page_number}"
    if chunk.slide_number:
        return f"Slide {chunk.slide_number}"
    if chunk.start_second is not None:
        start = _format_seconds(chunk.start_second)
        end = _format_seconds(chunk.end_second or chunk.start_second)
        return f"{start}-{end}"
    return chunk.section_heading or f"Chunk {chunk.chunk_index + 1}"
