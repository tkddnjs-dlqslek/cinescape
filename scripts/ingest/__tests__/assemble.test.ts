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

  it("ensures unique scene ids on slug collision by appending -2, -3, etc", () => {
    const collisionLocs: RawLocation[] = [
      { name: "Piazza", lat: 1, lng: 1 },
      { name: "Piazza", lat: 2, lng: 2 },
    ];
    const collisionTags: TaggedScene[] = [
      { name: "Piazza A", note: "first", bearing: 0 },
      { name: "Piazza B", note: "second", bearing: 45 },
    ];
    const film = assembleFilm(meta, collisionLocs, collisionTags);
    expect(film.scenes).toHaveLength(2);
    expect(film.scenes[0].id).toBe("call-me-by-your-name-piazza");
    expect(film.scenes[1].id).toBe("call-me-by-your-name-piazza-2");
  });

  it("uses placeholder still URL when stillUrls is empty", () => {
    const emptyStillMeta: FilmMeta = {
      title: "Test Film", year: 2020, director: "Test", tmdbId: 1, stillUrls: [],
    };
    const film = assembleFilm(emptyStillMeta, locs, tags);
    expect(film.scenes[0].stillUrl).toMatch(/^https:\/\//);
    expect(film.scenes[0].stillUrl).toContain("picsum.photos");
    expect(film.scenes[0].nowUrl).toBe(film.scenes[0].stillUrl);
  });

  it("sets nowUrl equal to stillUrl for all scenes", () => {
    const film = assembleFilm(meta, locs, tags);
    film.scenes.forEach((scene) => {
      expect(scene.nowUrl).toBe(scene.stillUrl);
    });
  });

  it("falls back to empty note and zero bearing when tags are missing", () => {
    const film = assembleFilm(meta, locs, []);
    expect(film.scenes[0].note).toBe("");
    expect(film.scenes[0].bearing).toBe(0);
    expect(film.scenes[1].note).toBe("");
    expect(film.scenes[1].bearing).toBe(0);
  });

  it("uses provided nowUrls when present, placeholder otherwise", () => {
    const film = assembleFilm(meta, locs, tags, ["https://upload.wikimedia.org/x.jpg", null]);
    expect(film.scenes[0].nowUrl).toBe("https://upload.wikimedia.org/x.jpg");
    expect(film.scenes[1].nowUrl).toBe(film.scenes[1].stillUrl); // null → placeholder
  });
});
