import { parseFilms, type Film, type Scene } from "@/lib/types";
import { makeFilmId, type FilmMeta, type RawLocation, type TaggedScene } from "./types";

const PLACEHOLDER_STILL = "https://picsum.photos/seed/cinescape-placeholder/1200/750";

function slug(s: string): string {
  return makeFilmId(s);
}

export function assembleFilm(
  meta: FilmMeta,
  locations: RawLocation[],
  tags: TaggedScene[],
): Film {
  const filmId = makeFilmId(meta.title);
  const stills = meta.stillUrls.length > 0 ? meta.stillUrls : [PLACEHOLDER_STILL];
  const scenes: Scene[] = locations.map((loc, i) => {
    const tag = tags[i] ?? { name: loc.name, note: "", bearing: 0 };
    const stillUrl = stills[i % stills.length];
    return {
      id: `${filmId}-${slug(loc.name)}`,
      name: tag.name || loc.name,
      note: tag.note,
      coord: { lat: loc.lat, lng: loc.lng },
      stillUrl,
      nowUrl: stillUrl, // placeholder — flagged for manual replacement (Global Constraints)
      bearing: tag.bearing,
    };
  });
  const film: Film = {
    id: filmId,
    title: meta.title,
    year: meta.year,
    director: meta.director,
    tmdbId: meta.tmdbId,
    scenes,
  };
  // Validate against the SAME schema the app uses. Throws on any invalid field
  // (e.g. empty scenes, bad URL, out-of-range coord) — fail fast, never emit bad data.
  return parseFilms([film])[0];
}
