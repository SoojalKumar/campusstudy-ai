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


def test_retrieve_relevant_chunks_searches_beyond_old_candidate_cap(db_session, seeded_data):
    chunks = [
        MaterialChunk(
            material_id=seeded_data["material"].id,
            chunk_index=index,
            text="Generic lecture context about study planning and course review.",
            token_count=9,
            section_heading="Generic",
            embedding=[0.1] * 16,
            metadata_json={},
        )
        for index in range(275)
    ]
    target_chunk = MaterialChunk(
        material_id=seeded_data["material"].id,
        chunk_index=275,
        text="Dijkstra priority queue relaxation updates shortest path distances.",
        token_count=8,
        section_heading="Dijkstra",
        embedding=[0.1] * 16,
        metadata_json={},
    )
    thread = ChatThread(
        user_id=seeded_data["owner"].id,
        title="Large course retrieval",
        scope_type=ChatScope.WORKSPACE,
        strict_mode=True,
        answer_style=ChatAnswerStyle.CONCISE,
    )
    db_session.add_all([*chunks, target_chunk, thread])
    db_session.commit()

    results = retrieve_relevant_chunks(
        db_session,
        thread=thread,
        query="How does Dijkstra relaxation use priority queues?",
        user=seeded_data["owner"],
        top_k=1,
    )

    assert results[0].id == target_chunk.id
