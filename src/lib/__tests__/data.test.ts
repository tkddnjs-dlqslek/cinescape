import { describe, it, expect } from "vitest";
import { getFilms, getFilmById, getAllScenes } from "@/lib/data";

describe("data", () => {
  it("loads catalog with ≥1 film; each film has ≥1 scene with non-empty id/name and numeric coords", () => {
    const films = getFilms();
    expect(films.length).toBeGreaterThanOrEqual(1);
    for (const film of films) {
      expect(film.scenes.length).toBeGreaterThanOrEqual(1);
      for (const scene of film.scenes) {
        expect(scene.id.length).toBeGreaterThan(0);
        expect(scene.name.length).toBeGreaterThan(0);
        expect(typeof scene.coord.lat).toBe("number");
        expect(typeof scene.coord.lng).toBe("number");
      }
    }
  });

  it("getFilmById returns the correct film for a known id and undefined for an unknown id", () => {
    const first = getFilms()[0];
    expect(getFilmById(first.id)).toEqual(first);
    expect(getFilmById("__nonexistent__")).toBeUndefined();
  });

  it("getAllScenes length equals total scene count across all films; each entry has {scene, film}", () => {
    const films = getFilms();
    const expected = films.reduce((sum, f) => sum + f.scenes.length, 0);
    const all = getAllScenes();
    expect(all.length).toBe(expected);
    for (const entry of all) {
      expect(entry).toHaveProperty("scene");
      expect(entry).toHaveProperty("film");
    }
  });
});
