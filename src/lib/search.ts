import type { Film } from "@/lib/types";

export function searchFilms(films: Film[], query: string): Film[] {
  const q = query.trim().toLowerCase();
  if (q === "") return films;
  return films.filter(
    (f) =>
      f.title.toLowerCase().includes(q) ||
      f.director.toLowerCase().includes(q),
  );
}
