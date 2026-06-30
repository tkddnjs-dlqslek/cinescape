import type { Film } from "@/lib/types";

export function mergeFilms(existing: Film[], incoming: Film): Film[] {
  const idx = existing.findIndex(
    (f) => f.tmdbId === incoming.tmdbId || f.id === incoming.id,
  );
  if (idx === -1) return [...existing, incoming];
  const copy = existing.slice();
  copy[idx] = incoming;
  return copy;
}
