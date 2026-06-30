import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchBar } from "@/components/SearchBar";
import type { Film } from "@/lib/types";

const films: Film[] = [
  { id: "a", title: "Call Me By Your Name", year: 2017, director: "Luca Guadagnino", tmdbId: null, scenes: [] as Film["scenes"] },
  { id: "b", title: "Before Sunrise", year: 1995, director: "Richard Linklater", tmdbId: null, scenes: [] as Film["scenes"] },
];

describe("SearchBar", () => {
  it("shows matching options as the user types", () => {
    render(<SearchBar films={films} onSelect={() => {}} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "call" } });
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Call Me By Your Name");
  });

  it("calls onSelect with the chosen film", () => {
    const onSelect = vi.fn();
    render(<SearchBar films={films} onSelect={onSelect} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "before" } });
    fireEvent.click(screen.getByRole("option"));
    expect(onSelect).toHaveBeenCalledWith(films[1]);
  });

  it("shows no options for an empty query", () => {
    render(<SearchBar films={films} onSelect={() => {}} />);
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
