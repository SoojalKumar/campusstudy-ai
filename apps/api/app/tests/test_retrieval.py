from app.models.entities import ChatThread, MaterialChunk
from app.models.enums import ChatAnswerStyle, ChatScope
from app.services.retrieval import retrieve_relevant_chunks


def test_retrieve_relevant_chunks_prefers_lexical_overlap(db_session, seeded_data):
    heap_chunk = MaterialChunk(
        material_id=seeded_data["material"].id,
        chunk_index=10,
        text="Heap insert bubbles an element upward until heap order is restored.",
        token_count=11,
        section_heading="Heaps",
        embedding=[0.1] * 16,
        metadata_json={},
    )
    graph_chunk = MaterialChunk(
        material_id=seeded_data["material"].id,
        chunk_index=11,
        text="Breadth-first search uses a queue for graph traversal and visits neighbors layer by layer.",
        token_count=14,
        section_heading="Graphs",
        embedding=[0.1] * 16,
        metadata_json={},
    )
    thread = ChatThread(
        user_id=seeded_data["owner"].id,
        title="Workspace retrieval",
        scope_type=ChatScope.WORKSPACE,
        strict_mode=True,
        answer_style=ChatAnswerStyle.CONCISE,
    )
    db_session.add_all([heap_chunk, graph_chunk, thread])
    db_session.commit()

    chunks = retrieve_relevant_chunks(
        db_session,
        thread=thread,
        query="How does heap insertion work?",
        user=seeded_data["owner"],
        top_k=2,
    )

    assert chunks[0].id == heap_chunk.id
