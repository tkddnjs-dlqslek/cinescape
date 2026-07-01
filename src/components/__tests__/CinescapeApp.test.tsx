import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { getFilms } from "@/lib/data";

// react-globe.gl can't render in jsdom — replace GlobeView with a stub.
vi.mock("@/components/GlobeView", () => ({
  GlobeView: ({ points }: { points: unknown[] }) => (
    <div data-testid="globe-stub">{points.length} points</div>
  ),
}));

import { CinescapeApp } from "@/components/CinescapeApp";

describe("CinescapeApp", () => {
  it("renders the globe with all seed scene points and no panel initially", () => {
    render(<CinescapeApp />);
    expect(screen.getByTestId("globe-stub")).toBeInTheDocument();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("shows the scene panel after selecting a film from search", () => {
    const film = getFilms()[0];
    // Use the first word of the title (lowercased) as the search term —
    // always a substring of the title so searchFilms always returns this film.
    const searchTerm = film.title.split(" ")[0].toLowerCase();
    // Escape regex special chars so any film title can be used safely.
    const titlePattern = new RegExp(
      film.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    render(<CinescapeApp />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: searchTerm } });
    fireEvent.click(screen.getByRole("option", { name: titlePattern }));
    expect(screen.getByRole("complementary")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: film.title })).toBeInTheDocument();
  });
});
