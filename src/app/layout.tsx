import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CINESCAPE — 시네필 촬영지 여행 지도",
  description: "영화 촬영지를 세계지도에서 탐색하고 Then/Now로 비교하세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
