import { describe, it, expect } from "vitest";
import { mergeFilms } from "@/../scripts/ingest/merge";
import type { Film } from "@/lib/types";

const mk = (id: string, tmdbId: number, title: string): Film => ({
  id, title, year: 2000, director: "D", tmdbId,
  scenes: [{ id: `${id}-s`, name: "S", note: "", coord: { lat: 1, lng: 1 }, stillUrl: "https://e.com/a.jpg", nowUrl: "https://e.com/a.jpg", bearing: 0 }],
});

describe("mergeFilms", () => {
  it("appends a new film", () => {
    const out = mergeFilms([mk("a", 1, "A")], mk("b", 2, "B"));
    expect(out.map((f) => f.id)).toEqual(["a", "b"]);
  });
  it("replaces an existing film with the same tmdbId (idempotent re-ingest)", () => {
    const out = mergeFilms([mk("a", 1, "A")], mk("a", 1, "A v2"));
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("A v2");
  });
});
