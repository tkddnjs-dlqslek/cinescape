import { describe, it, expect } from "vitest";
import { assembleFilm } from "@/../scripts/ingest/assemble";
import type { FilmMeta, RawLocation, TaggedScene } from "@/../scripts/ingest/types";

const meta: FilmMeta = {
  title: "Call Me By Your Name", year: 2017, director: "Luca Guadagnino",
  tmdbId: 398818, stillUrls: ["https://image.tmdb.org/t/p/w1280/a.jpg"],
};
const locs: RawLocation[] = [
  { name: "Crema", lat: 45.3628, lng: 9.6859 },
  { name: "Bergamo", lat: 45.7038, lng: 9.6614 },
];
const tags: TaggedScene[] = [
  { name: "Crema", note: "광장 아침", bearing: 120 },
  { name: "Bergamo", note: "당일치기", bearing: 30 },
];

describe("assembleFilm", () => {
  it("builds a schema-valid Film with one scene per location", () => {
    const film = assembleFilm(meta, locs, tags);
    expect(film.id).toBe("call-me-by-your-name");
    expect(film.scenes).toHaveLength(2);
    expect(film.scenes[0].id).toBe("call-me-by-your-name-crema");
    expect(film.scenes[0].note).toBe("광장 아침");
    expect(film.scenes[0].coord).toEqual({ lat: 45.3628, lng: 9.6859 });
  });

  it("reuses still URLs cyclically when there are more locations than stills", () => {
    const film = assembleFilm(meta, locs, tags);
    expect(film.scenes[0].stillUrl).toBe("https://image.tmdb.org/t/p/w1280/a.jpg");
    expect(film.scenes[1].stillUrl).toBe("https://image.tmdb.org/t/p/w1280/a.jpg");
  });

  it("throws (via parseFilms) when no valid scenes exist", () => {
    expect(() => assembleFilm(meta, [], [])).toThrow();
  });
});
