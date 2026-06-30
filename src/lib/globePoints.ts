import type { Scene, Film } from "@/lib/types";

export type GlobePoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  filmId: string;
  active: boolean;
};

export function scenesToPoints(
  scenes: { scene: Scene; film: Film }[],
  activeFilmId: string | null,
): GlobePoint[] {
  return scenes.map(({ scene, film }) => ({
    id: scene.id,
    lat: scene.coord.lat,
    lng: scene.coord.lng,
    label: `${scene.name} · ${film.title}`,
    filmId: film.id,
    active: film.id === activeFilmId,
  }));
}
