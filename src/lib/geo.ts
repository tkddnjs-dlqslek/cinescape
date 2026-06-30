import type { Coord, Scene, Film } from "@/lib/types";

const R = 6371; // km
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: Coord, b: Coord): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearbyScenes(
  origin: Scene,
  all: { scene: Scene; film: Film }[],
  k: number,
): { scene: Scene; film: Film; km: number }[] {
  return all
    .filter((x) => x.scene.id !== origin.id)
    .map((x) => ({ ...x, km: haversineKm(origin.coord, x.scene.coord) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, k);
}
