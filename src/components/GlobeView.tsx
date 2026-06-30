"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { GlobePoint } from "@/lib/globePoints";

// react-globe.gl uses WebGL — must be client-only.
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

export function GlobeView({
  points,
  focus,
  onPointClick,
}: {
  points: GlobePoint[];
  focus: { lat: number; lng: number } | null;
  onPointClick: (filmId: string, sceneId: string) => void;
}) {
  // react-globe.gl exposes an imperative API via ref.
  const globeRef = useRef<{ pointOfView: (c: object, ms?: number) => void } | null>(null);

  useEffect(() => {
    if (focus && globeRef.current) {
      globeRef.current.pointOfView({ lat: focus.lat, lng: focus.lng, altitude: 1.4 }, 1600);
    }
  }, [focus]);

  return (
    <Globe
      // @ts-expect-error react-globe.gl ref typing is loose
      ref={globeRef}
      backgroundColor="rgba(0,0,0,0)"
      globeImageUrl="/earth-night.jpg"
      pointsData={points}
      pointLat={(d: object) => (d as GlobePoint).lat}
      pointLng={(d: object) => (d as GlobePoint).lng}
      pointLabel={(d: object) => (d as GlobePoint).label}
      pointColor={(d: object) => ((d as GlobePoint).active ? "#ffffff" : "#7cc7ff")}
      pointAltitude={(d: object) => ((d as GlobePoint).active ? 0.08 : 0.04)}
      pointRadius={(d: object) => ((d as GlobePoint).active ? 0.5 : 0.32)}
      onPointClick={(d: object) => onPointClick((d as GlobePoint).filmId, (d as GlobePoint).id)}
    />
  );
}
