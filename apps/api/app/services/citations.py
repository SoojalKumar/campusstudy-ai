from app.models.entities import MaterialChunk


def format_source_label(chunk: MaterialChunk) -> str:
    if chunk.page_number:
        return f"Page {chunk.page_number}"
    if chunk.slide_number:
        return f"Slide {chunk.slide_number}"
    if chunk.start_second is not None:
        return f"{chunk.start_second}s-{chunk.end_second or chunk.start_second}s"
    return chunk.section_heading or f"Chunk {chunk.chunk_index + 1}"

