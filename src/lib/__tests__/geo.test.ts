import { describe, it, expect } from "vitest";
import { haversineKm, nearbyScenes } from "@/lib/geo";
import type { Scene, Film } from "@/lib/types";

const mk = (id: string, lat: number, lng: number): Scene => ({
  id, name: id, note: "", coord: { lat, lng },
  stillUrl: "https://e.com/a.jpg", nowUrl: "https://e.com/b.jpg", bearing: 0,
});
const film: Film = { id: "f", title: "F", year: 2000, director: "D", tmdbId: null, scenes: [] };

describe("haversineKm", () => {
  it("computes a known distance (Paris–London ≈ 343 km)", () => {
    const d = haversineKm({ lat: 48.8566, lng: 2.3522 }, { lat: 51.5074, lng: -0.1278 });
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(355);
  });
  it("is zero for identical points", () => {
    expect(haversineKm({ lat: 10, lng: 10 }, { lat: 10, lng: 10 })).toBeCloseTo(0);
  });
});

describe("nearbyScenes", () => {
  const origin = mk("o", 0, 0);
  const all = [
    { scene: origin, film },
    { scene: mk("near", 0, 0.1), film },
    { scene: mk("mid", 0, 1), film },
    { scene: mk("far", 0, 10), film },
  ];
  it("excludes the origin and returns k nearest ascending by distance", () => {
    const res = nearbyScenes(origin, all, 2);
    expect(res.map((r) => r.scene.id)).toEqual(["near", "mid"]);
    expect(res[0].km).toBeLessThan(res[1].km);
  });
  it("returns fewer than k when not enough candidates exist", () => {
    const res = nearbyScenes(origin, all, 10);
    expect(res).toHaveLength(3);
  });
});
