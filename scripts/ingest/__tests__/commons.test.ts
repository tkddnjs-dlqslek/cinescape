import { describe, it, expect } from "vitest";
import { buildGeosearchUrl, parseGeosearch, buildImageInfoUrl, parseImageInfo } from "@/../scripts/ingest/commons";
import geo from "@/../scripts/ingest/__fixtures__/commons-geosearch.json";
import info from "@/../scripts/ingest/__fixtures__/commons-imageinfo.json";

describe("buildGeosearchUrl", () => {
  it("embeds coords, File namespace 6, and json format", () => {
    const u = buildGeosearchUrl(45.36, 9.68);
    expect(u).toContain("45.36");
    expect(u).toContain("9.68");
    expect(u).toContain("gsnamespace=6");
    expect(u).toContain("format=json");
  });
});

describe("parseGeosearch", () => {
  it("returns File titles, keeping only image files", () => {
    const titles = parseGeosearch(geo);
    expect(titles.length).toBeGreaterThanOrEqual(1);
    expect(titles.every((t) => /\.(jpe?g|png)$/i.test(t))).toBe(true);
  });
});

describe("parseImageInfo", () => {
  it("returns the first image url", () => {
    expect(parseImageInfo(info)).toBe("https://upload.wikimedia.org/wikipedia/commons/a/ab/Crema.jpg");
  });
  it("returns null when no pages have imageinfo", () => {
    expect(parseImageInfo({ query: { pages: {} } })).toBeNull();
  });
});

describe("buildImageInfoUrl", () => {
  it("embeds the title and iiprop=url", () => {
    const u = buildImageInfoUrl("File:Crema.jpg");
    expect(u).toContain("Crema.jpg");
    expect(u).toContain("iiprop=url");
  });
});
