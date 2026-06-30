import type { Scene, Film } from "@/lib/types";

export type RawLocation = { name: string; lat: number; lng: number };
export type FilmMeta = { title: string; year: number; director: string; tmdbId: number; stillUrls: string[] };
export type TaggedScene = { name: string; note: string; bearing: number };

export interface WikidataFetcher { locations(tmdbId: number): Promise<RawLocation[]> }
export interface TmdbFetcher { meta(tmdbId: number): Promise<FilmMeta> }
export interface SceneTagger { tag(filmTitle: string, loc: RawLocation): Promise<TaggedScene> }

export type { Scene, Film };

export function makeFilmId(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
