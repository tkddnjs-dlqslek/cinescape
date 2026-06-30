import { describe, it, expect } from "vitest";
import { buildTagPrompt, parseTagResponse } from "@/../scripts/ingest/sceneTagger";

describe("buildTagPrompt", () => {
  it("includes the film title and location name and asks for JSON", () => {
    const p = buildTagPrompt("Call Me By Your Name", { name: "Crema", lat: 45.36, lng: 9.68 });
    expect(p).toContain("Call Me By Your Name");
    expect(p).toContain("Crema");
    expect(p.toLowerCase()).toContain("json");
  });
});

describe("parseTagResponse", () => {
  it("parses a JSON note + bearing", () => {
    const t = parseTagResponse('{"note":"광장을 가로지르던 아침","bearing":120}');
    expect(t.note).toContain("광장");
    expect(t.bearing).toBe(120);
  });
  it("tolerates surrounding prose and code fences", () => {
    const t = parseTagResponse('여기요:\n```json\n{"note":"강가","bearing":30}\n```');
    expect(t.bearing).toBe(30);
  });
  it("clamps an out-of-range or missing bearing to 0", () => {
    expect(parseTagResponse('{"note":"x","bearing":999}').bearing).toBe(0);
    expect(parseTagResponse('{"note":"x"}').bearing).toBe(0);
  });
});
