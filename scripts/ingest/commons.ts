import type { RawLocation, NowPhotoFetcher } from "./types";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "CinescapeIngest/1.0 (https://github.com/tkddnjs-dlqslek/cinescape)";

export function buildGeosearchUrl(lat: number, lng: number): string {
  const p = new URLSearchParams({
    action: "query", list: "geosearch",
    gscoord: `${lat}|${lng}`, gsradius: "2000", gsnamespace: "6",
    gslimit: "10", format: "json", origin: "*",
  });
  return `${API}?${p.toString()}`;
}

export function parseGeosearch(json: unknown): string[] {
  const arr = (json as { query?: { geosearch?: Array<{ title: string }> } })?.query?.geosearch ?? [];
  return arr.map((g) => g.title).filter((t) => /\.(jpe?g|png)$/i.test(t));
}

export function buildImageInfoUrl(title: string): string {
  const p = new URLSearchParams({
    action: "query", titles: title, prop: "imageinfo",
    iiprop: "url", format: "json", origin: "*",
  });
  return `${API}?${p.toString()}`;
}

export function parseImageInfo(json: unknown): string | null {
  const pages = (json as { query?: { pages?: Record<string, { imageinfo?: Array<{ url: string }> }> } })?.query?.pages ?? {};
  for (const page of Object.values(pages)) {
    const url = page.imageinfo?.[0]?.url;
    if (url) return url;
  }
  return null;
}

export function makeCommonsFetcher(fetchFn: typeof fetch = fetch): NowPhotoFetcher {
  return {
    async now(loc: RawLocation): Promise<string | null> {
      const geoRes = await fetchFn(buildGeosearchUrl(loc.lat, loc.lng), { headers: { "User-Agent": UA } });
      if (!geoRes.ok) return null;
      const titles = parseGeosearch(await geoRes.json());
      if (titles.length === 0) return null;
      const infoRes = await fetchFn(buildImageInfoUrl(titles[0]), { headers: { "User-Agent": UA } });
      if (!infoRes.ok) return null;
      return parseImageInfo(await infoRes.json());
    },
  };
}
