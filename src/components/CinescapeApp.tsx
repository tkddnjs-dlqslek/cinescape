"use client";
import { useMemo, useState } from "react";
import { getFilms, getAllScenes, getFilmById } from "@/lib/data";
import { scenesToPoints } from "@/lib/globePoints";
import { SearchBar } from "@/components/SearchBar";
import { ScenePanel } from "@/components/ScenePanel";
import { GlobeView } from "@/components/GlobeView";

export function CinescapeApp() {
  const films = useMemo(() => getFilms(), []);
  const allScenes = useMemo(() => getAllScenes(), []);
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);

  const points = useMemo(
    () => scenesToPoints(allScenes, selectedFilmId),
    [allScenes, selectedFilmId],
  );

  const selectedFilm = selectedFilmId ? getFilmById(selectedFilmId) : undefined;
  const firstScene = selectedFilm?.scenes[0] ?? null;
  const focus = firstScene ? { lat: firstScene.coord.lat, lng: firstScene.coord.lng } : null;

  return (
    <main style={{ position: "fixed", inset: 0 }}>
      <GlobeView points={points} focus={focus} onPointClick={setSelectedFilmId} />

      <header
        style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 80,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 40px", zIndex: 30,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: ".18em" }}>
          CINE<span style={{ color: "var(--accent)" }}>SCAPE</span>
        </div>
        <SearchBar films={films} onSelect={(f) => setSelectedFilmId(f.id)} />
      </header>

      {selectedFilm && firstScene && (
        <ScenePanel film={selectedFilm} scene={firstScene} />
      )}
    </main>
  );
}
