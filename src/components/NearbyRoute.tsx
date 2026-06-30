"use client";
import type { Scene } from "@/lib/types";
import { getAllScenes } from "@/lib/data";
import { nearbyScenes } from "@/lib/geo";

export function NearbyRoute({ origin }: { origin: Scene }) {
  const stops = nearbyScenes(origin, getAllScenes(), 3);
  return (
    <div style={{ padding: "18px 24px 22px" }}>
      <h4 style={{ fontSize: 11, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 14 }}>
        가까운 촬영지 3곳 · 추천 동선
      </h4>
      <div style={{ display: "flex", gap: 10 }}>
        {stops.map(({ scene, film, km }) => (
          <div key={scene.id} data-testid="nearby-stop" style={{ flex: 1 }}>
            <div
              style={{
                height: 58, borderRadius: 12, marginBottom: 7, border: "1px solid var(--line)",
                backgroundImage: `url(${scene.nowUrl})`, backgroundSize: "cover", backgroundPosition: "center",
              }}
            />
            <div style={{ fontSize: 13, fontWeight: 500 }}>{scene.name}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{film.title}</div>
            <div style={{ fontSize: 11, color: "var(--accent)" }}>{Math.round(km)} km</div>
          </div>
        ))}
      </div>
    </div>
  );
}
