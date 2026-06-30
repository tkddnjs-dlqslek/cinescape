"use client";
import { useState } from "react";

export function ThenNowSlider({
  stillUrl,
  nowUrl,
  alt,
}: {
  stillUrl: string;
  nowUrl: string;
  alt: string;
}) {
  const [pos, setPos] = useState(54);
  return (
    <div style={{ position: "relative", width: "100%", height: 236, overflow: "hidden" }}>
      <div
        aria-label={`${alt} — 영화 장면`}
        style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${stillUrl})`, backgroundSize: "cover", backgroundPosition: "center",
        }}
      />
      <div
        aria-label={`${alt} — 현재`}
        style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${nowUrl})`, backgroundSize: "cover", backgroundPosition: "center",
          clipPath: `inset(0 0 0 ${pos}%)`,
        }}
      />
      <div
        style={{
          position: "absolute", top: 0, bottom: 0, left: `${pos}%`, width: 2,
          background: "linear-gradient(var(--accent), var(--violet))",
          boxShadow: "0 0 16px var(--accent)", pointerEvents: "none",
        }}
      />
      <input
        type="range" min={0} max={100} value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={`${alt} Then/Now 비교 슬라이더`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "ew-resize" }}
      />
      <span style={tagStyle("left")}>FILM</span>
      <span style={{ ...tagStyle("right"), color: "var(--accent)" }}>TODAY</span>
    </div>
  );
}

function tagStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute", bottom: 12, [side]: 12,
    fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase",
    background: "rgba(5,6,13,.6)", border: "1px solid var(--line)",
    padding: "5px 10px", borderRadius: 8, pointerEvents: "none",
  } as React.CSSProperties;
}
