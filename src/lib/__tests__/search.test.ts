import { describe, it, expect } from "vitest";
import { searchFilms } from "@/lib/search";
import type { Film } from "@/lib/types";

const films: Film[] = [
  { id: "a", title: "Call Me By Your Name", year: 2017, director: "Luca Guadagnino", tmdbId: null, scenes: [] as Film["scenes"] },
  { id: "b", title: "Before Sunrise", year: 1995, director: "Richard Linklater", tmdbId: null, scenes: [] as Film["scenes"] },
];

describe("searchFilms", () => {
  it("matches title case-insensitively and trims whitespace", () => {
    expect(searchFilms(films, "  call me  ").map((f) => f.id)).toEqual(["a"]);
  });
  it("matches by director", () => {
    expect(searchFilms(films, "linklater").map((f) => f.id)).toEqual(["b"]);
  });
  it("returns all films for an empty query", () => {
    expect(searchFilms(films, "  ")).toHaveLength(2);
  });
  it("returns empty array when nothing matches", () => {
    expect(searchFilms(films, "zzz")).toHaveLength(0);
  });
});
