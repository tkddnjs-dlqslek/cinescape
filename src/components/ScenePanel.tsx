"use client";
import type { Film, Scene } from "@/lib/types";
import { ThenNowSlider } from "@/components/ThenNowSlider";
import { NearbyRoute } from "@/components/NearbyRoute";

export function ScenePanel({ film, scene }: { film: Film; scene: Scene }) {
  return (
    <aside
      style={{
        position: "fixed", right: 40, top: 104, width: 400, borderRadius: 22, zIndex: 35, overflow: "hidden",
        background: "linear-gradient(180deg, rgba(20,28,60,.72), rgba(10,15,38,.78))",
        border: "1px solid var(--line)", backdropFilter: "blur(26px)",
        boxShadow: "0 40px 90px rgba(0,0,0,.6)",
      }}
    >
      <div style={{ padding: "22px 24px 16px" }}>
        <span
          style={{
            display: "inline-block", fontSize: 10.5, letterSpacing: ".12em", color: "var(--accent)",
            background: "rgba(124,199,255,.12)", border: "1px solid rgba(124,199,255,.25)",
            padding: "5px 11px", borderRadius: 20, textTransform: "uppercase",
          }}
        >
          {film.director} · {film.year}
        </span>
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 38, lineHeight: 1, margin: "14px 0 6px" }}>
          {film.title}
        </h2>
        <p style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 18, color: "#cbd6ff", marginTop: 14 }}>
          {scene.note}
        </p>
      </div>
      <ThenNowSlider stillUrl={scene.stillUrl} nowUrl={scene.nowUrl} alt={scene.name} />
      <NearbyRoute origin={scene} />
    </aside>
  );
}
