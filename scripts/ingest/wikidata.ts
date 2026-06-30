import type { RawLocation, WikidataFetcher } from "./types";

const ENDPOINT = "https://query.wikidata.org/sparql";

export function buildSparql(tmdbId: number): string {
  return `
SELECT ?placeLabel ?coord WHERE {
  ?film wdt:P4947 "${tmdbId}" .
  ?film wdt:P915 ?place .
  ?place wdt:P625 ?coord .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,it,fr,ko". }
}
LIMIT 100`.trim();
}

export function parseWikidata(json: unknown): RawLocation[] {
  const bindings =
    (json as { results?: { bindings?: Array<Record<string, { value: string }>> } })
      ?.results?.bindings ?? [];
  const out: RawLocation[] = [];
  const seen = new Set<string>();
  for (const b of bindings) {
    const name = b.placeLabel?.value;
    const wkt = b.coord?.value;
    if (!name || !wkt) continue;
    const m = wkt.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
    if (!m) continue;
    const lng = Number(m[1]);
    const lat = Number(m[2]);
    const key = `${lat},${lng}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, lat, lng });
  }
  return out;
}

export function makeWikidataFetcher(
  fetchFn: typeof fetch = fetch,
): WikidataFetcher {
  return {
    async locations(tmdbId: number): Promise<RawLocation[]> {
      const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(buildSparql(tmdbId))}`;
      const res = await fetchFn(url, {
        headers: {
          Accept: "application/sparql-results+json",
          "User-Agent": "CinescapeIngest/1.0 (https://github.com/tkddnjs-dlqslek/cinescape)",
        },
      });
      if (!res.ok) throw new Error(`Wikidata ${res.status} ${res.statusText}: ${url}`);
      return parseWikidata(await res.json());
    },
  };
}
