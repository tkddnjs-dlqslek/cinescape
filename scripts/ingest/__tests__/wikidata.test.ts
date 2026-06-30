import { describe, it, expect } from "vitest";
import { buildSparql, parseWikidata } from "@/../scripts/ingest/wikidata";
import fixture from "@/../scripts/ingest/__fixtures__/wikidata-cmbyn.json";

describe("buildSparql", () => {
  it("embeds the TMDB id and asks for P915 filming locations with P625 coords", () => {
    const q = buildSparql(398818);
    expect(q).toContain("398818");
    expect(q).toContain("P915");
    expect(q).toContain("P625");
    expect(q).toContain("P4947");
  });
});

describe("parseWikidata", () => {
  it("parses WKT Point(lng lat) bindings into RawLocation with lat/lng", () => {
    const locs = parseWikidata(fixture);
    expect(locs.length).toBeGreaterThanOrEqual(1);
    const crema = locs.find((l) => l.name.includes("Crema"));
    expect(crema).toBeDefined();
    expect(crema!.lat).toBeCloseTo(45.36, 1);
    expect(crema!.lng).toBeCloseTo(9.68, 1);
  });

  it("deduplicates identical coordinates", () => {
    const locs = parseWikidata(fixture);
    const keys = locs.map((l) => `${l.lat},${l.lng}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
