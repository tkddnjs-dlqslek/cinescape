import { describe, it, expect } from "vitest";
import { scenesToPoints } from "@/lib/globePoints";
import type { Scene, Film } from "@/lib/types";

const film: Film = { id: "cmbyn", title: "CMBYN", year: 2017, director: "LG", tmdbId: null, scenes: [] };
const scene: Scene = {
  id: "s1", name: "Piazza", note: "", coord: { lat: 45.36, lng: 9.68 },
  stillUrl: "https://e.com/a.jpg", nowUrl: "https://e.com/b.jpg", bearing: 0,
};

describe("scenesToPoints", () => {
  it("maps a scene to a globe point with lat/lng/label", () => {
    const [p] = scenesToPoints([{ scene, film }], null);
    expect(p).toMatchObject({ id: "s1", lat: 45.36, lng: 9.68, filmId: "cmbyn", active: false });
    expect(p.label).toContain("Piazza");
  });
  it("flags points belonging to the active film", () => {
    const [p] = scenesToPoints([{ scene, film }], "cmbyn");
    expect(p.active).toBe(true);
  });
});
