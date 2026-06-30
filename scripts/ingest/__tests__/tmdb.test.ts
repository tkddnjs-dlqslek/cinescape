import { describe, it, expect } from "vitest";
import { parseTmdb } from "@/../scripts/ingest/tmdb";
import detail from "@/../scripts/ingest/__fixtures__/tmdb-cmbyn.json";

describe("parseTmdb", () => {
  it("extracts title, year, director, tmdbId and builds full image URLs", () => {
    const meta = parseTmdb(detail, (detail as { images: unknown }).images);
    expect(meta.title).toBe("Call Me by Your Name");
    expect(meta.year).toBe(2017);
    expect(meta.director).toBe("Luca Guadagnino");
    expect(meta.tmdbId).toBe(398818);
    expect(meta.stillUrls[0]).toBe("https://image.tmdb.org/t/p/w1280/abc.jpg");
    expect(meta.stillUrls.length).toBeLessThanOrEqual(8);
  });
});
