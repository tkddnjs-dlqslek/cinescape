import { describe, it, expect } from "vitest";
import { parseFilms } from "@/lib/types";

const valid = [{
  id: "cmbyn", title: "Call Me By Your Name", year: 2017,
  director: "Luca Guadagnino", tmdbId: 398818,
  scenes: [{
    id: "cmbyn-piazza", name: "Piazza Duomo", note: "광장을 가로지르던 아침",
    coord: { lat: 45.3628, lng: 9.6859 },
    stillUrl: "https://example.com/still.jpg",
    nowUrl: "https://example.com/now.jpg", bearing: 120,
  }],
}];

describe("parseFilms", () => {
  it("parses a valid film array", () => {
    const films = parseFilms(valid);
    expect(films).toHaveLength(1);
    expect(films[0].scenes[0].coord.lat).toBeCloseTo(45.3628);
  });

  it("rejects a film with latitude out of range", () => {
    const bad = structuredClone(valid);
    bad[0].scenes[0].coord.lat = 200;
    expect(() => parseFilms(bad)).toThrow();
  });

  it("rejects a film missing a title", () => {
    const bad = structuredClone(valid) as unknown[];
    delete (bad[0] as Record<string, unknown>).title;
    expect(() => parseFilms(bad)).toThrow();
  });
});
