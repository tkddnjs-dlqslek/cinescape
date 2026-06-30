# CINESCAPE v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시네필이 영화를 검색해 3D 글로브에서 촬영지로 flyTo하고, 핀 클릭 시 Then/Now 슬라이더로 영화 스틸과 현재 모습을 비교하며, 가까운 촬영지 3곳을 동선으로 묶어 볼 수 있는 v1 웹앱을 손큐레이션 시드 데이터로 동작·배포한다.

**Architecture:** Next.js(App Router) + TypeScript 단일 페이지. 데이터는 빌드타임 정적 JSON(zod 검증). 순수 로직(스키마·지오·검색·points 매핑)은 Vitest로 TDD. react-globe.gl(ThreeJS WebGL) 글로브는 클라이언트 전용 컴포넌트로, 시각 부분은 순수 함수로 분리해 테스트하고 컴포넌트 자체는 빌드/수동 검증. 시각 방향은 Direction C "Midnight Glass". 배포는 Vercel.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, react-globe.gl, three, zod, Vitest, @testing-library/react, jsdom.

## Global Constraints

- 비상업 데모 전제. 영화 스틸/사진은 데모 목적 placeholder URL 또는 라이선스 확인된 소스만. 코드/데이터에 저작권 자산 직접 커밋 금지(URL 참조만).
- 시각 방향 = **Direction C "Midnight Glass"**: 배경 `#05060d`→`#0b1024` 그라데이션, 액센트 시안 `#7cc7ff`·바이올렛 `#b69cff`, 글래스 패널 `rgba(255,255,255,.06)` + `backdrop-filter: blur(26px)`, 본문 `Inter`, 디스플레이 `Instrument Serif`.
- 모든 거리 계산은 km 단위, 하버사인. 좌표는 `{ lat: number, lng: number }` 형태로 통일.
- react-globe.gl은 SSR 불가 → 반드시 `next/dynamic`의 `{ ssr: false }`로 로드.
- 패키지 매니저: npm. Node 20+.
- 커밋 메시지 prefix: `feat:` / `test:` / `chore:` / `style:`. 작업 단위마다 커밋.
- 작업 디렉토리 루트: `C:/Users/user/Desktop/movie-map/`. 모든 경로는 이 루트 기준 상대경로.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts` | 프로젝트 설정 |
| `src/lib/types.ts` | Film/Scene 타입 + zod 스키마 (단일 진실원) |
| `src/lib/data.ts` | 시드 JSON 로드 + zod 검증 + 조회 헬퍼 |
| `data/films.json` | 손큐레이션 시드 데이터셋 |
| `src/lib/geo.ts` | 하버사인 거리 + 근처 N개 선택 + 동선 정렬 |
| `src/lib/search.ts` | 영화 검색/필터 (순수 함수) |
| `src/lib/globePoints.ts` | Scene[] → 글로브 points 배열 매핑 (순수 함수) |
| `src/components/ThenNowSlider.tsx` | 히어로: 스틸↔현재 비교 슬라이더 |
| `src/components/SearchBar.tsx` | 우상단 검색창 |
| `src/components/ScenePanel.tsx` | 선택 영화 패널 (메타 + ThenNow + Nearby) |
| `src/components/NearbyRoute.tsx` | 가까운 3곳 동선 카드 |
| `src/components/GlobeView.tsx` | react-globe.gl 래퍼 (client, ssr:false) |
| `src/app/page.tsx` | 상태 오케스트레이션 (검색→선택→flyTo→패널) |
| `src/app/layout.tsx`, `src/app/globals.css` | Midnight Glass 테마·폰트 |
| `src/lib/__tests__/*.test.ts` | 순수 로직 테스트 |
| `src/components/__tests__/*.test.tsx` | 컴포넌트 테스트 |

---

### Task 1: 프로젝트 스캐폴드 + 테스트 러너

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `vitest.setup.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Test: `src/lib/__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: (없음 — 첫 작업)
- Produces: 동작하는 Next.js 앱 + `npm test`로 도는 Vitest. 이후 모든 작업이 이 위에 빌드됨.

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "cinescape",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-globe.gl": "2.31.0",
    "three": "0.171.0",
    "zod": "3.24.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/react": "16.1.0",
    "@types/node": "22.10.2",
    "@types/react": "19.0.2",
    "@types/three": "0.171.0",
    "jsdom": "25.0.1",
    "typescript": "5.7.2",
    "vitest": "2.1.8",
    "@vitejs/plugin-react": "4.3.4"
  }
}
```

- [ ] **Step 2: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: next.config.ts + vitest 설정 작성**

`next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};

export default nextConfig;
```

`vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

`vitest.setup.ts`:
```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: 최소 앱 셸 작성**

`src/app/globals.css`:
```css
:root {
  --bg0: #05060d; --bg1: #0b1024; --ink: #eaf0ff; --muted: #8a93b8;
  --accent: #7cc7ff; --violet: #b69cff;
  --glass: rgba(255, 255, 255, 0.06); --line: rgba(255, 255, 255, 0.12);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body {
  background: linear-gradient(160deg, var(--bg0), var(--bg1));
  color: var(--ink);
  font-family: Inter, system-ui, sans-serif;
  overflow: hidden;
}
```

`src/app/layout.tsx`:
```tsx
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
```

`src/app/page.tsx`:
```tsx
export default function Home() {
  return <main aria-label="cinescape-root">CINESCAPE</main>;
}
```

- [ ] **Step 5: 스모크 테스트 작성**

`src/lib/__tests__/smoke.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs the test runner", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: 설치 + 테스트 실행**

Run:
```bash
npm install
npm test
```
Expected: smoke 테스트 1개 PASS.

- [ ] **Step 7: 커밋**

```bash
git add package.json tsconfig.json next.config.ts vitest.config.ts vitest.setup.ts src/ .gitignore
git commit -m "chore: scaffold Next.js + Vitest for cinescape"
```
(`.gitignore`에 `node_modules/`, `.next/`가 없으면 추가 후 스테이징)

---

### Task 2: 데이터 스키마 + 타입

**Files:**
- Create: `src/lib/types.ts`
- Test: `src/lib/__tests__/types.test.ts`

**Interfaces:**
- Consumes: zod
- Produces:
  - `Coord = { lat: number; lng: number }`
  - `Scene = { id: string; name: string; note: string; coord: Coord; stillUrl: string; nowUrl: string; bearing: number }`
  - `Film = { id: string; title: string; year: number; director: string; tmdbId: number | null; scenes: Scene[] }`
  - `FilmSchema: z.ZodType<Film>`, `parseFilms(data: unknown): Film[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/__tests__/types.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseFilms } from "@/lib/types";

const valid = [{
  id: "cmbyn", title: "Call Me By Your Name", year: 2017,
  director: "Luca Guadagnino", tmdbId: 398818,
  scenes: [{
    id: "cmbyn-piazza", name: "Piazza Duomo", note: "광장을 가로지르던 아침",
    coord: { lat: 45.3628, lng: 9.6859 },
    stillUrl: "https://example.com/still.jpg",
    nowUrl: "https://example.com/now.jpg", bearing: 120,
  }],
}];

describe("parseFilms", () => {
  it("parses a valid film array", () => {
    const films = parseFilms(valid);
    expect(films).toHaveLength(1);
    expect(films[0].scenes[0].coord.lat).toBeCloseTo(45.3628);
  });

  it("rejects a film with latitude out of range", () => {
    const bad = structuredClone(valid);
    bad[0].scenes[0].coord.lat = 200;
    expect(() => parseFilms(bad)).toThrow();
  });

  it("rejects a film missing a title", () => {
    const bad = structuredClone(valid) as unknown[];
    delete (bad[0] as Record<string, unknown>).title;
    expect(() => parseFilms(bad)).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- types`
Expected: FAIL — `parseFilms` not exported / module not found.

- [ ] **Step 3: 최소 구현**

`src/lib/types.ts`:
```typescript
import { z } from "zod";

export const CoordSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const SceneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  note: z.string(),
  coord: CoordSchema,
  stillUrl: z.string().url(),
  nowUrl: z.string().url(),
  bearing: z.number().min(0).max(360),
});

export const FilmSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  year: z.number().int().min(1888).max(2100),
  director: z.string().min(1),
  tmdbId: z.number().int().nullable(),
  scenes: z.array(SceneSchema).min(1),
});

export const FilmsSchema = z.array(FilmSchema);

export type Coord = z.infer<typeof CoordSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Film = z.infer<typeof FilmSchema>;

export function parseFilms(data: unknown): Film[] {
  return FilmsSchema.parse(data);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- types`
Expected: 3 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/types.ts src/lib/__tests__/types.test.ts
git commit -m "feat: add film/scene zod schema and parseFilms"
```

---

### Task 3: 시드 데이터셋 + 로더 (콜미바이유어네임 골든패스)

**Files:**
- Create: `data/films.json`
- Create: `src/lib/data.ts`
- Test: `src/lib/__tests__/data.test.ts`

**Interfaces:**
- Consumes: `parseFilms`, `Film`, `Scene` (Task 2)
- Produces:
  - `getFilms(): Film[]` — 검증된 시드 전체
  - `getFilmById(id: string): Film | undefined`
  - `getAllScenes(): { scene: Scene; film: Film }[]` — 글로브 핀 전개용

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/__tests__/data.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { getFilms, getFilmById, getAllScenes } from "@/lib/data";

describe("data", () => {
  it("loads and validates seed films", () => {
    const films = getFilms();
    expect(films.length).toBeGreaterThanOrEqual(3);
  });

  it("includes Call Me By Your Name with multiple scenes", () => {
    const film = getFilmById("cmbyn");
    expect(film).toBeDefined();
    expect(film!.title).toBe("Call Me By Your Name");
    expect(film!.scenes.length).toBeGreaterThanOrEqual(5);
  });

  it("flattens every scene with its parent film", () => {
    const all = getAllScenes();
    expect(all.length).toBeGreaterThan(0);
    expect(all[0]).toHaveProperty("scene");
    expect(all[0]).toHaveProperty("film");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- data`
Expected: FAIL — module `@/lib/data` not found.

- [ ] **Step 3: 시드 데이터 작성**

`data/films.json` (콜미바이유어네임은 장면 5개 이상; 좌표는 실제 크레마/롬바르디아 근사값, URL은 데모 placeholder):
```json
[
  {
    "id": "cmbyn",
    "title": "Call Me By Your Name",
    "year": 2017,
    "director": "Luca Guadagnino",
    "tmdbId": 398818,
    "scenes": [
      { "id": "cmbyn-piazza", "name": "Piazza Duomo, Crema", "note": "엘리오와 올리버가 광장을 가로지르던 아침", "coord": { "lat": 45.3628, "lng": 9.6859 }, "stillUrl": "https://picsum.photos/seed/cmbyn-film1/1200/750", "nowUrl": "https://picsum.photos/seed/cmbyn-now1/1200/750", "bearing": 120 },
      { "id": "cmbyn-fountain", "name": "Fontana di Crema", "note": "둘이 처음 함께 멈춰 섰던 분수", "coord": { "lat": 45.3631, "lng": 9.6866 }, "stillUrl": "https://picsum.photos/seed/cmbyn-film2/1200/750", "nowUrl": "https://picsum.photos/seed/cmbyn-now2/1200/750", "bearing": 200 },
      { "id": "cmbyn-villa", "name": "Villa Albergoni, Moscazzano", "note": "여름을 보낸 그 별장", "coord": { "lat": 45.3389, "lng": 9.6711 }, "stillUrl": "https://picsum.photos/seed/cmbyn-film3/1200/750", "nowUrl": "https://picsum.photos/seed/cmbyn-now3/1200/750", "bearing": 75 },
      { "id": "cmbyn-river", "name": "Fontanile Quarantina", "note": "강가에서의 오후", "coord": { "lat": 45.3512, "lng": 9.6420 }, "stillUrl": "https://picsum.photos/seed/cmbyn-film4/1200/750", "nowUrl": "https://picsum.photos/seed/cmbyn-now4/1200/750", "bearing": 310 },
      { "id": "cmbyn-station", "name": "Stazione di Crema", "note": "올리버를 떠나보낸 역", "coord": { "lat": 45.3567, "lng": 9.6938 }, "stillUrl": "https://picsum.photos/seed/cmbyn-film5/1200/750", "nowUrl": "https://picsum.photos/seed/cmbyn-now5/1200/750", "bearing": 90 },
      { "id": "cmbyn-bergamo", "name": "Bergamo Alta", "note": "둘이 자전거로 떠난 당일치기", "coord": { "lat": 45.7038, "lng": 9.6614 }, "stillUrl": "https://picsum.photos/seed/cmbyn-film6/1200/750", "nowUrl": "https://picsum.photos/seed/cmbyn-now6/1200/750", "bearing": 150 }
    ]
  },
  {
    "id": "before-sunrise",
    "title": "Before Sunrise",
    "year": 1995,
    "director": "Richard Linklater",
    "tmdbId": 76,
    "scenes": [
      { "id": "bs-prater", "name": "Wiener Riesenrad, Prater", "note": "관람차 안에서의 첫 키스", "coord": { "lat": 48.2165, "lng": 16.3958 }, "stillUrl": "https://picsum.photos/seed/bs-film1/1200/750", "nowUrl": "https://picsum.photos/seed/bs-now1/1200/750", "bearing": 45 },
      { "id": "bs-cafe", "name": "Café Sperl", "note": "전화 흉내를 내던 카페", "coord": { "lat": 48.1987, "lng": 16.3636 }, "stillUrl": "https://picsum.photos/seed/bs-film2/1200/750", "nowUrl": "https://picsum.photos/seed/bs-now2/1200/750", "bearing": 270 }
    ]
  },
  {
    "id": "midnight-in-paris",
    "title": "Midnight in Paris",
    "year": 2011,
    "director": "Woody Allen",
    "tmdbId": 59436,
    "scenes": [
      { "id": "mip-steps", "name": "Église Saint-Étienne-du-Mont", "note": "자정에 클래식 푸조가 멈추던 계단", "coord": { "lat": 48.8469, "lng": 2.3486 }, "stillUrl": "https://picsum.photos/seed/mip-film1/1200/750", "nowUrl": "https://picsum.photos/seed/mip-now1/1200/750", "bearing": 30 },
      { "id": "mip-bridge", "name": "Pont Alexandre III", "note": "빗속을 걷던 다리", "coord": { "lat": 48.8638, "lng": 2.3136 }, "stillUrl": "https://picsum.photos/seed/mip-film2/1200/750", "nowUrl": "https://picsum.photos/seed/mip-now2/1200/750", "bearing": 210 }
    ]
  }
]
```

- [ ] **Step 4: 로더 구현**

`src/lib/data.ts`:
```typescript
import raw from "../../data/films.json";
import { parseFilms, type Film, type Scene } from "@/lib/types";

const films: Film[] = parseFilms(raw);

export function getFilms(): Film[] {
  return films;
}

export function getFilmById(id: string): Film | undefined {
  return films.find((f) => f.id === id);
}

export function getAllScenes(): { scene: Scene; film: Film }[] {
  return films.flatMap((film) => film.scenes.map((scene) => ({ scene, film })));
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- data`
Expected: 3 tests PASS.

- [ ] **Step 6: 커밋**

```bash
git add data/films.json src/lib/data.ts src/lib/__tests__/data.test.ts
git commit -m "feat: add curated seed dataset (CMBYN golden path) and loader"
```

---

### Task 4: 지오 유틸 — 거리·근처 N개·동선 정렬

**Files:**
- Create: `src/lib/geo.ts`
- Test: `src/lib/__tests__/geo.test.ts`

**Interfaces:**
- Consumes: `Coord`, `Scene`, `Film` (Task 2)
- Produces:
  - `haversineKm(a: Coord, b: Coord): number`
  - `nearbyScenes(origin: Scene, all: { scene: Scene; film: Film }[], k: number): { scene: Scene; film: Film; km: number }[]` — origin 자신 제외, 가까운 순 k개

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/__tests__/geo.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { haversineKm, nearbyScenes } from "@/lib/geo";
import type { Scene, Film } from "@/lib/types";

const mk = (id: string, lat: number, lng: number): Scene => ({
  id, name: id, note: "", coord: { lat, lng },
  stillUrl: "https://e.com/a.jpg", nowUrl: "https://e.com/b.jpg", bearing: 0,
});
const film: Film = { id: "f", title: "F", year: 2000, director: "D", tmdbId: null, scenes: [] };

describe("haversineKm", () => {
  it("computes a known distance (Paris–London ≈ 343 km)", () => {
    const d = haversineKm({ lat: 48.8566, lng: 2.3522 }, { lat: 51.5074, lng: -0.1278 });
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(355);
  });
  it("is zero for identical points", () => {
    expect(haversineKm({ lat: 10, lng: 10 }, { lat: 10, lng: 10 })).toBeCloseTo(0);
  });
});

describe("nearbyScenes", () => {
  const origin = mk("o", 0, 0);
  const all = [
    { scene: origin, film },
    { scene: mk("near", 0, 0.1), film },
    { scene: mk("mid", 0, 1), film },
    { scene: mk("far", 0, 10), film },
  ];
  it("excludes the origin and returns k nearest ascending by distance", () => {
    const res = nearbyScenes(origin, all, 2);
    expect(res.map((r) => r.scene.id)).toEqual(["near", "mid"]);
    expect(res[0].km).toBeLessThan(res[1].km);
  });
  it("returns fewer than k when not enough candidates exist", () => {
    const res = nearbyScenes(origin, all, 10);
    expect(res).toHaveLength(3);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- geo`
Expected: FAIL — module not found.

- [ ] **Step 3: 최소 구현**

`src/lib/geo.ts`:
```typescript
import type { Coord, Scene, Film } from "@/lib/types";

const R = 6371; // km
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: Coord, b: Coord): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearbyScenes(
  origin: Scene,
  all: { scene: Scene; film: Film }[],
  k: number,
): { scene: Scene; film: Film; km: number }[] {
  return all
    .filter((x) => x.scene.id !== origin.id)
    .map((x) => ({ ...x, km: haversineKm(origin.coord, x.scene.coord) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, k);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- geo`
Expected: 4 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/geo.ts src/lib/__tests__/geo.test.ts
git commit -m "feat: add haversine distance and nearby-scenes selection"
```

---

### Task 5: 검색/필터 로직

**Files:**
- Create: `src/lib/search.ts`
- Test: `src/lib/__tests__/search.test.ts`

**Interfaces:**
- Consumes: `Film` (Task 2)
- Produces: `searchFilms(films: Film[], query: string): Film[]` — 제목·감독 부분일치(대소문자·앞뒤공백 무시). 빈 쿼리는 전체 반환.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/__tests__/search.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { searchFilms } from "@/lib/search";
import type { Film } from "@/lib/types";

const films: Film[] = [
  { id: "a", title: "Call Me By Your Name", year: 2017, director: "Luca Guadagnino", tmdbId: null, scenes: [] as Film["scenes"] },
  { id: "b", title: "Before Sunrise", year: 1995, director: "Richard Linklater", tmdbId: null, scenes: [] as Film["scenes"] },
];

describe("searchFilms", () => {
  it("matches title case-insensitively and trims whitespace", () => {
    expect(searchFilms(films, "  call me  ").map((f) => f.id)).toEqual(["a"]);
  });
  it("matches by director", () => {
    expect(searchFilms(films, "linklater").map((f) => f.id)).toEqual(["b"]);
  });
  it("returns all films for an empty query", () => {
    expect(searchFilms(films, "  ")).toHaveLength(2);
  });
  it("returns empty array when nothing matches", () => {
    expect(searchFilms(films, "zzz")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- search`
Expected: FAIL — module not found.

- [ ] **Step 3: 최소 구현**

`src/lib/search.ts`:
```typescript
import type { Film } from "@/lib/types";

export function searchFilms(films: Film[], query: string): Film[] {
  const q = query.trim().toLowerCase();
  if (q === "") return films;
  return films.filter(
    (f) =>
      f.title.toLowerCase().includes(q) ||
      f.director.toLowerCase().includes(q),
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- search`
Expected: 4 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/search.ts src/lib/__tests__/search.test.ts
git commit -m "feat: add film search by title and director"
```

---

### Task 6: 글로브 points 매핑 (순수 함수)

**Files:**
- Create: `src/lib/globePoints.ts`
- Test: `src/lib/__tests__/globePoints.test.ts`

**Interfaces:**
- Consumes: `Scene`, `Film` (Task 2)
- Produces:
  - `type GlobePoint = { id: string; lat: number; lng: number; label: string; filmId: string; active: boolean }`
  - `scenesToPoints(scenes: { scene: Scene; film: Film }[], activeFilmId: string | null): GlobePoint[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/__tests__/globePoints.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { scenesToPoints } from "@/lib/globePoints";
import type { Scene, Film } from "@/lib/types";

const film: Film = { id: "cmbyn", title: "CMBYN", year: 2017, director: "LG", tmdbId: null, scenes: [] };
const scene: Scene = {
  id: "s1", name: "Piazza", note: "", coord: { lat: 45.36, lng: 9.68 },
  stillUrl: "https://e.com/a.jpg", nowUrl: "https://e.com/b.jpg", bearing: 0,
};

describe("scenesToPoints", () => {
  it("maps a scene to a globe point with lat/lng/label", () => {
    const [p] = scenesToPoints([{ scene, film }], null);
    expect(p).toMatchObject({ id: "s1", lat: 45.36, lng: 9.68, filmId: "cmbyn", active: false });
    expect(p.label).toContain("Piazza");
  });
  it("flags points belonging to the active film", () => {
    const [p] = scenesToPoints([{ scene, film }], "cmbyn");
    expect(p.active).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- globePoints`
Expected: FAIL — module not found.

- [ ] **Step 3: 최소 구현**

`src/lib/globePoints.ts`:
```typescript
import type { Scene, Film } from "@/lib/types";

export type GlobePoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  filmId: string;
  active: boolean;
};

export function scenesToPoints(
  scenes: { scene: Scene; film: Film }[],
  activeFilmId: string | null,
): GlobePoint[] {
  return scenes.map(({ scene, film }) => ({
    id: scene.id,
    lat: scene.coord.lat,
    lng: scene.coord.lng,
    label: `${scene.name} · ${film.title}`,
    filmId: film.id,
    active: film.id === activeFilmId,
  }));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- globePoints`
Expected: 2 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/globePoints.ts src/lib/__tests__/globePoints.test.ts
git commit -m "feat: add scenesToPoints mapping for globe layer"
```

---

### Task 7: ThenNowSlider 컴포넌트 (히어로)

**Files:**
- Create: `src/components/ThenNowSlider.tsx`
- Test: `src/components/__tests__/ThenNowSlider.test.tsx`

**Interfaces:**
- Consumes: (없음 — props 기반)
- Produces: `ThenNowSlider({ stillUrl, nowUrl, alt }: { stillUrl: string; nowUrl: string; alt: string })`
  - 슬라이더(`role="slider"`, `<input type="range">`)로 0~100 위치 조절, "now" 레이어 `clip-path: inset(0 0 0 {value}%)`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/__tests__/ThenNowSlider.test.tsx`:
```tsx
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- ThenNowSlider`
Expected: FAIL — module not found.

- [ ] **Step 3: 최소 구현**

`src/components/ThenNowSlider.tsx`:
```tsx
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- ThenNowSlider`
Expected: 2 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/ThenNowSlider.tsx src/components/__tests__/ThenNowSlider.test.tsx
git commit -m "feat: add Then/Now reveal slider (hero component)"
```

---

### Task 8: SearchBar 컴포넌트

**Files:**
- Create: `src/components/SearchBar.tsx`
- Test: `src/components/__tests__/SearchBar.test.tsx`

**Interfaces:**
- Consumes: `Film` (Task 2), `searchFilms` (Task 5)
- Produces: `SearchBar({ films, onSelect }: { films: Film[]; onSelect: (film: Film) => void })`
  - 입력값으로 `searchFilms` 결과를 드롭다운(`role="listbox"`, 항목 `role="option"`)으로 표시, 클릭 시 `onSelect` 호출.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/__tests__/SearchBar.test.tsx`:
```tsx
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- SearchBar`
Expected: FAIL — module not found.

- [ ] **Step 3: 최소 구현**

`src/components/SearchBar.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { Film } from "@/lib/types";
import { searchFilms } from "@/lib/search";

export function SearchBar({
  films,
  onSelect,
}: {
  films: Film[];
  onSelect: (film: Film) => void;
}) {
  const [query, setQuery] = useState("");
  const results = query.trim() === "" ? [] : searchFilms(films, query);

  return (
    <div style={{ position: "relative", width: 360 }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 11,
          background: "var(--glass)", border: "1px solid var(--line)",
          borderRadius: 14, padding: "12px 17px", backdropFilter: "blur(20px)",
        }}
      >
        <span style={{ color: "var(--accent)" }}>⌕</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="영화를 검색하세요 — 'Call Me By Your Name'"
          aria-label="영화 검색"
          style={{ background: "none", border: "none", outline: "none", color: "var(--ink)", fontSize: 13.5, width: "100%" }}
        />
      </div>
      {results.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
            listStyle: "none", background: "rgba(10,15,38,.92)", border: "1px solid var(--line)",
            borderRadius: 12, overflow: "hidden", backdropFilter: "blur(20px)", zIndex: 40,
          }}
        >
          {results.map((film) => (
            <li
              key={film.id}
              role="option"
              aria-selected={false}
              onClick={() => {
                onSelect(film);
                setQuery("");
              }}
              style={{ padding: "11px 16px", cursor: "pointer", fontSize: 13.5 }}
            >
              {film.title}{" "}
              <span style={{ color: "var(--muted)" }}>· {film.year}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- SearchBar`
Expected: 3 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/SearchBar.tsx src/components/__tests__/SearchBar.test.tsx
git commit -m "feat: add search bar with film autocomplete dropdown"
```

---

### Task 9: NearbyRoute + ScenePanel 컴포넌트

**Files:**
- Create: `src/components/NearbyRoute.tsx`
- Create: `src/components/ScenePanel.tsx`
- Test: `src/components/__tests__/ScenePanel.test.tsx`

**Interfaces:**
- Consumes: `Film`, `Scene` (Task 2), `getAllScenes` (Task 3), `nearbyScenes` (Task 4), `ThenNowSlider` (Task 7)
- Produces:
  - `NearbyRoute({ origin }: { origin: Scene })` — `getAllScenes()` 기준 가까운 3곳 카드(이름 + km).
  - `ScenePanel({ film, scene }: { film: Film; scene: Scene })` — 메타(제목·감독·연도) + 장면 note + `ThenNowSlider` + `NearbyRoute`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/__tests__/ScenePanel.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScenePanel } from "@/components/ScenePanel";
import { getFilmById } from "@/lib/data";

describe("ScenePanel", () => {
  it("renders the film title, director, the scene note, and the hero slider", () => {
    const film = getFilmById("cmbyn")!;
    const scene = film.scenes[0];
    render(<ScenePanel film={film} scene={scene} />);
    expect(screen.getByText("Call Me By Your Name")).toBeInTheDocument();
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- ScenePanel`
Expected: FAIL — module not found.

- [ ] **Step 3: NearbyRoute 구현**

`src/components/NearbyRoute.tsx`:
```tsx
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
```

- [ ] **Step 4: ScenePanel 구현**

`src/components/ScenePanel.tsx`:
```tsx
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
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- ScenePanel`
Expected: 2 tests PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/components/NearbyRoute.tsx src/components/ScenePanel.tsx src/components/__tests__/ScenePanel.test.tsx
git commit -m "feat: add scene panel with nearby-3 route and hero slider"
```

---

### Task 10: GlobeView 컴포넌트 (react-globe.gl, client/ssr:false)

**Files:**
- Create: `src/components/GlobeView.tsx`
- Test: (시각/ WebGL — jsdom 단위 테스트 부적합. Task 6 `scenesToPoints`로 데이터 매핑은 이미 검증됨. 본 컴포넌트는 Task 12 빌드 검증으로 확인.)

**Interfaces:**
- Consumes: `GlobePoint`, `scenesToPoints` (Task 6)
- Produces: `GlobeView({ points, focus, onPointClick }: { points: GlobePoint[]; focus: { lat: number; lng: number } | null; onPointClick: (filmId: string) => void })`
  - `focus`가 바뀌면 `globeRef.current.pointOfView({ lat, lng, altitude }, ms)`로 flyTo.

- [ ] **Step 1: GlobeView 구현 (테스트 없는 시각 컴포넌트 — 인터페이스 정확성 우선)**

`src/components/GlobeView.tsx`:
```tsx
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
  onPointClick: (filmId: string) => void;
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
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      pointsData={points}
      pointLat={(d: object) => (d as GlobePoint).lat}
      pointLng={(d: object) => (d as GlobePoint).lng}
      pointLabel={(d: object) => (d as GlobePoint).label}
      pointColor={(d: object) => ((d as GlobePoint).active ? "#ffffff" : "#7cc7ff")}
      pointAltitude={(d: object) => ((d as GlobePoint).active ? 0.08 : 0.04)}
      pointRadius={(d: object) => ((d as GlobePoint).active ? 0.5 : 0.32)}
      onPointClick={(d: object) => onPointClick((d as GlobePoint).filmId)}
    />
  );
}
```

- [ ] **Step 2: 타입체크 통과 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (GlobeView 관련 타입 에러 0).

- [ ] **Step 3: 커밋**

```bash
git add src/components/GlobeView.tsx
git commit -m "feat: add react-globe.gl wrapper with flyTo on focus"
```

---

### Task 11: 페이지 오케스트레이션 (검색→선택→flyTo→패널)

**Files:**
- Modify: `src/app/page.tsx` (Task 1의 placeholder를 교체)
- Create: `src/components/CinescapeApp.tsx`
- Test: `src/components/__tests__/CinescapeApp.test.tsx`

**Interfaces:**
- Consumes: `getFilms`, `getAllScenes` (Task 3), `scenesToPoints` (Task 6), `SearchBar` (Task 8), `ScenePanel` (Task 9), `GlobeView` (Task 10)
- Produces: `CinescapeApp()` — 클라이언트 루트. 상태: `selectedFilmId`. 영화 선택 시 첫 장면으로 `focus` 설정 + `ScenePanel` 표시. (GlobeView는 jsdom에서 깨지므로 테스트에서는 mock.)

- [ ] **Step 1: 실패하는 테스트 작성 (GlobeView mock)**

`src/components/__tests__/CinescapeApp.test.tsx`:
```tsx
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
    expect(screen.getByText("Call Me By Your Name")).toBeInTheDocument();
  });
});
```

(참고: `ScenePanel`의 `<aside>`는 ARIA role `complementary`로 조회된다.)

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- CinescapeApp`
Expected: FAIL — module `@/components/CinescapeApp` not found.

- [ ] **Step 3: CinescapeApp 구현**

`src/components/CinescapeApp.tsx`:
```tsx
"use client";
import { useMemo, useState } from "react";
import { getFilms, getAllScenes, getFilmById } from "@/lib/data";
import { scenesToPoints } from "@/lib/globePoints";
import { SearchBar } from "@/components/SearchBar";
import { ScenePanel } from "@/components/ScenePanel";
import { GlobeView } from "@/components/GlobeView";

export function CinescapeApp() {
  const films = useMemo(() => getFilms(), []);
  const allScenes = useMemo(() => getAllScenes(), []);
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);

  const points = useMemo(
    () => scenesToPoints(allScenes, selectedFilmId),
    [allScenes, selectedFilmId],
  );

  const selectedFilm = selectedFilmId ? getFilmById(selectedFilmId) : undefined;
  const firstScene = selectedFilm?.scenes[0] ?? null;
  const focus = firstScene ? { lat: firstScene.coord.lat, lng: firstScene.coord.lng } : null;

  return (
    <main style={{ position: "fixed", inset: 0 }}>
      <GlobeView points={points} focus={focus} onPointClick={setSelectedFilmId} />

      <header
        style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 80,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 40px", zIndex: 30,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: ".18em" }}>
          CINE<span style={{ color: "var(--accent)" }}>SCAPE</span>
        </div>
        <SearchBar films={films} onSelect={(f) => setSelectedFilmId(f.id)} />
      </header>

      {selectedFilm && firstScene && (
        <ScenePanel film={selectedFilm} scene={firstScene} />
      )}
    </main>
  );
}
```

- [ ] **Step 4: page.tsx 교체**

`src/app/page.tsx`:
```tsx
import { CinescapeApp } from "@/components/CinescapeApp";

export default function Home() {
  return <CinescapeApp />;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- CinescapeApp`
Expected: 2 tests PASS.

- [ ] **Step 6: 전체 테스트 + 커밋**

Run: `npm test`
Expected: 모든 테스트 PASS.
```bash
git add src/components/CinescapeApp.tsx src/components/__tests__/CinescapeApp.test.tsx src/app/page.tsx
git commit -m "feat: wire search → select → flyTo → scene panel"
```

---

### Task 12: 빌드 검증 + 수동 시연 + 배포 설정

**Files:**
- Create: `README.md`
- Create: `vercel.json` (선택 — Next.js는 zero-config이나 명시)

**Interfaces:**
- Consumes: 전체 앱
- Produces: 프로덕션 빌드 통과 + 로컬 실행 시 히어로 플로우 동작 확인 + 배포 준비.

- [ ] **Step 1: 프로덕션 빌드**

Run: `npm run build`
Expected: 빌드 성공, 타입·린트 에러 없음. (실패 시 해당 작업으로 돌아가 수정.)

- [ ] **Step 2: 로컬 실행 + 수동 시연 체크리스트**

Run: `npm run dev` → http://localhost:3000
확인:
- 다크 글로브가 회전하며 핀(시드 장면들)이 보인다.
- 검색창에 "call me" 입력 → 드롭다운에 콜미바이유어네임 → 클릭 시 글로브가 크레마로 flyTo.
- 우측 패널에 제목/감독/장면 note + Then/Now 슬라이더(드래그하면 현재/영화 경계 이동) + 가까운 3곳 km 표시.
- 핀을 직접 클릭해도 해당 영화 패널이 뜬다.

- [ ] **Step 3: README 작성**

`README.md`:
```markdown
# CINESCAPE

시네필을 위한 영화 촬영지 여행 지도. 영화를 검색해 3D 글로브에서 촬영지로 이동하고,
Then/Now 슬라이더로 영화 장면과 현재 모습을 비교하며, 가까운 촬영지 3곳을 동선으로 묶어 봅니다.

## 개발
\`\`\`bash
npm install
npm run dev    # http://localhost:3000
npm test       # Vitest
npm run build  # 프로덕션 빌드
\`\`\`

## 구조
- `data/films.json` — 손큐레이션 시드 데이터셋
- `src/lib/` — 스키마(types)·데이터(data)·지오(geo)·검색(search)·글로브 매핑(globePoints)
- `src/components/` — GlobeView, ThenNowSlider, SearchBar, ScenePanel, NearbyRoute, CinescapeApp

## 데이터 확장 (Phase 2, 별도 plan)
Wikidata SPARQL(P915+P625) + TMDB API + LLM 장면 태깅으로 반자동 인제스트.

비상업 데모. 이미지 URL은 placeholder이며 실제 스틸은 라이선스 확인 후 교체.
```

- [ ] **Step 4: 커밋**

```bash
git add README.md vercel.json
git commit -m "chore: add README and verify production build"
```

- [ ] **Step 5: 배포 (수동 — 사용자 승인 후)**

Vercel CLI 또는 대시보드로 배포. 라이브 URL 확보 후 README 상단에 배지/링크 추가.
(배포는 외부 공개 행위이므로 사용자 명시 승인 후 진행.)

---

## Self-Review

**1. Spec coverage (DESIGN.md 대조):**
- 히어로 Then/Now → Task 7, 9 ✅
- 검색→줌인 → Task 8, 10(flyTo), 11 ✅
- 가까운 3곳 동선 → Task 4, 9 ✅
- 감각적 지도(Direction C Midnight Glass) → Global Constraints + Task 1 테마 + 컴포넌트 인라인 스타일 ✅
- 손큐레이션 시드(전 세계, 클러스터링) → Task 3 (CMBYN 크레마+베르가모, 비포선라이즈 빈, 미드나잇인파리 파리) ✅
- 기술 스택(Next.js + react-globe.gl + 정적 JSON + Vercel) → Task 1, 10, 12 ✅
- 데이터 경로(Wikidata+TMDB+LLM) → **의도적으로 별도 plan으로 분리** (스코프 체크에서 명시). tmdbId 필드는 스키마에 미리 마련(Task 2) ✅
- 배포(Vercel) → Task 12 ✅

**2. Placeholder scan:** 모든 코드 스텝에 실제 코드 포함. "TODO/적절히 처리" 없음. ✅

**3. Type consistency:**
- `Coord/Scene/Film` (Task 2) → 전 작업에서 동일 사용. ✅
- `getAllScenes()` 반환형 `{ scene, film }[]` → Task 3 정의, Task 4(nearbyScenes 입력)·Task 6(scenesToPoints 입력)·Task 9(NearbyRoute)에서 동일. ✅
- `GlobePoint` (Task 6) → Task 10 GlobeView prop으로 동일. ✅
- `scenesToPoints(scenes, activeFilmId)` 시그니처 → Task 6 정의, Task 11 호출 일치. ✅
- `nearbyScenes(origin, all, k)` → Task 4 정의, Task 9 호출(`getAllScenes()`, 3) 일치. ✅

이슈 없음.

---

## Out of Scope (별도 plan #2 예정)
- **반자동 인제스트 파이프라인**: Wikidata SPARQL 쿼리 → 좌표 추출 → TMDB로 스틸/메타 보강 → LLM 장면 태깅 → `data/films.json` 자동 생성. 독립 Node 스크립트 서브시스템.
- **"이 도시의 영화 지도" 밀도 뷰** (DESIGN ④): v1 동선 카드로 부분 충족, 전용 뷰는 v2.
- **고감도 디자인 폴리시 패스** (`/design-review`): v1 동작 확정 후.
- **실제 스틸/현재 사진 라이선스 교체** (Street View / Mapillary / Wikimedia).
