import { describe, it, expect } from "vitest";
import { makeFilmId } from "@/../scripts/ingest/types";

describe("makeFilmId", () => {
  it("slugifies a title into a stable id", () => {
    expect(makeFilmId("Call Me By Your Name")).toBe("call-me-by-your-name");
  });
  it("strips punctuation and collapses spaces", () => {
    expect(makeFilmId("  Amélie:  Le Fabuleux! ")).toBe("amelie-le-fabuleux");
  });
});
