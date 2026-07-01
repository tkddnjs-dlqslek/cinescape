import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScenePanel } from "@/components/ScenePanel";
import { getFilms, getAllScenes } from "@/lib/data";

describe("ScenePanel", () => {
  it("renders the film title, director, scene note, and hero slider", () => {
    const film = getFilms()[0];
    const scene = film.scenes[0];
    render(<ScenePanel film={film} scene={scene} />);
    expect(screen.getByRole("heading", { name: film.title })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(film.director))).toBeInTheDocument();
    expect(screen.getByText(scene.note)).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("renders the expected number of nearby stops with distances", () => {
    const film = getFilms()[0];
    const totalScenes = getAllScenes().length;
    // nearbyScenes excludes the origin scene and returns at most 3
    const expectedNearby = Math.min(3, totalScenes - 1);
    render(<ScenePanel film={film} scene={film.scenes[0]} />);
    expect(screen.getAllByTestId("nearby-stop")).toHaveLength(expectedNearby);
    if (expectedNearby > 0) {
      expect(screen.getAllByText(/km$/).length).toBeGreaterThanOrEqual(expectedNearby);
    }
  });
});
