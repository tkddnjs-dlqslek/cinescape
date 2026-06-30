import raw from "../../data/films.json";
import { parseFilms, type Film, type Scene } from "@/lib/types";

const films: Film[] = parseFilms(raw);

export function getFilms(): Film[] {
  return films;
}

export function getFilmById(id: string): Film | undefined {
  return films.find((f) => f.id === id);
}

export function getAllScenes(): { scene: Scene; film: Film }[] {
  return films.flatMap((film) => film.scenes.map((scene) => ({ scene, film })));
}
