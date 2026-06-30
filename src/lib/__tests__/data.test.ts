import { describe, it, expect } from "vitest";
import { getFilms, getFilmById, getAllScenes } from "@/lib/data";

describe("data", () => {
  it("loads and validates seed films", () => {
    const films = getFilms();
    expect(films.length).toBeGreaterThanOrEqual(3);
  });

  it("includes Call Me By Your Name with multiple scenes", () => {
    const film = getFilmById("cmbyn");
    expect(film).toBeDefined();
    expect(film!.title).toBe("Call Me By Your Name");
    expect(film!.scenes.length).toBeGreaterThanOrEqual(5);
  });

  it("flattens every scene with its parent film", () => {
    const all = getAllScenes();
    expect(all.length).toBeGreaterThan(0);
    expect(all[0]).toHaveProperty("scene");
    expect(all[0]).toHaveProperty("film");
  });
});
