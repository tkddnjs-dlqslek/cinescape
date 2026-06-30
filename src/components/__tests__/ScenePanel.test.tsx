import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScenePanel } from "@/components/ScenePanel";
import { getFilmById } from "@/lib/data";

describe("ScenePanel", () => {
  it("renders the film title, director, the scene note, and the hero slider", () => {
    const film = getFilmById("cmbyn")!;
    const scene = film.scenes[0];
    render(<ScenePanel film={film} scene={scene} />);
    expect(screen.getByRole("heading", { name: "Call Me By Your Name" })).toBeInTheDocument();
    expect(screen.getByText(/Luca Guadagnino/)).toBeInTheDocument();
    expect(screen.getByText(scene.note)).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("renders three nearby stops with distances", () => {
    const film = getFilmById("cmbyn")!;
    render(<ScenePanel film={film} scene={film.scenes[0]} />);
    expect(screen.getAllByTestId("nearby-stop")).toHaveLength(3);
    expect(screen.getAllByText(/km$/).length).toBeGreaterThanOrEqual(3);
  });
});
