import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThenNowSlider } from "@/components/ThenNowSlider";

describe("ThenNowSlider", () => {
  it("renders both then and now layers with the given alt", () => {
    render(<ThenNowSlider stillUrl="https://e.com/then.jpg" nowUrl="https://e.com/now.jpg" alt="Piazza" />);
    expect(screen.getByLabelText("Piazza — 영화 장면")).toBeInTheDocument();
    expect(screen.getByLabelText("Piazza — 현재")).toBeInTheDocument();
  });

  it("updates the reveal position when the range input changes", () => {
    render(<ThenNowSlider stillUrl="https://e.com/then.jpg" nowUrl="https://e.com/now.jpg" alt="Piazza" />);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "30" } });
    const now = screen.getByLabelText("Piazza — 현재");
    expect(now.style.clipPath).toBe("inset(0 0 0 30%)");
  });
});
