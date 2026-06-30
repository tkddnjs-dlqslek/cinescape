import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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
    render(<CinescapeApp />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "call me" } });
    fireEvent.click(screen.getByRole("option"));
    expect(screen.getByRole("complementary")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Call Me By Your Name" })).toBeInTheDocument();
  });
});
