import type { FilmMeta, TmdbFetcher } from "./types";

const IMG_BASE = "https://image.tmdb.org/t/p/w1280";

export function parseTmdb(detail: unknown, images: unknown): FilmMeta {
  const d = detail as {
    id: number; title: string; release_date?: string;
    credits?: { crew?: Array<{ job: string; name: string }> };
  };
  const img = images as { backdrops?: Array<{ file_path: string }> };
  const director =
    d.credits?.crew?.find((c) => c.job === "Director")?.name ?? "Unknown";
  const year = d.release_date ? Number(d.release_date.slice(0, 4)) : 0;
  const stillUrls = (img.backdrops ?? [])
    .slice(0, 8)
    .map((b) => `${IMG_BASE}${b.file_path}`);
  return { title: d.title, year, director, tmdbId: d.id, stillUrls };
}

export function makeTmdbFetcher(apiKey: string, fetchFn: typeof fetch = fetch): TmdbFetcher {
  return {
    async meta(tmdbId: number): Promise<FilmMeta> {
      const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits,images`;
      const res = await fetchFn(url);
      if (!res.ok) throw new Error(`TMDB ${res.status}`);
      const detail = await res.json();
      return parseTmdb(detail, (detail as { images: unknown }).images);
    },
  };
}
