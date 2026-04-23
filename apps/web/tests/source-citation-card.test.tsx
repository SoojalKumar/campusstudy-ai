import { render, screen } from "@testing-library/react";

import { SourceCitationCard } from "@/components/source-citation-card";

describe("SourceCitationCard", () => {
  it("renders the citation label and snippet", () => {
    render(
      <SourceCitationCard
        citation={{
          chunkId: "chunk-1",
          sourceLabel: "Page 3",
          snippet: "Queue behavior matters for BFS."
        }}
      />
    );

    expect(screen.getByText("Page 3")).toBeInTheDocument();
    expect(screen.getByText("Queue behavior matters for BFS.")).toBeInTheDocument();
  });
});
