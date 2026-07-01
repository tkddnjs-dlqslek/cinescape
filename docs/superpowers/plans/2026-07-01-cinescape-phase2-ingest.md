# CINESCAPE Phase 2 — Semi-Auto Ingest Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 영화의 TMDB id 하나를 입력하면 Wikidata SPARQL로 촬영지 좌표를, TMDB로 메타데이터·스틸 이미지를, LLM으로 "어느 장면인지" 노트를 채워, 기존 zod 스키마(`Film[]`)를 통과하는 항목을 `data/films.json`에 반자동으로 추가하는 CLI 파이프라인.

**Architecture:** 독립 Node/TSX 스크립트(`scripts/ingest/`). 외부 호출(Wikidata/TMDB/Anthropic)은 주입 가능한 fetcher 인터페이스 뒤에 두어, 순수 변환 함수(쿼리 빌더·응답 파서·조립기)를 Vitest + fixture로 TDD한다. 최종 산출물은 v1과 동일한 `parseFilms`(src/lib/types.ts)로 검증해 데이터 무결성을 보장한다. 네트워크 통합은 fixture로 테스트하고, 실제 호출은 CLI 수동 실행으로 검증한다.

**Tech Stack:** TypeScript, tsx(실행), Vitest(기존), @anthropic-ai/sdk, 표준 fetch(Node 20+ 내장), 기존 zod 스키마 재사용.

## Global Constraints

- 출력은 반드시 기존 `parseFilms`(`src/lib/types.ts`)를 통과해야 한다. scene 필드: `id, name, note, coord{lat,lng}, stillUrl, nowUrl, bearing`. film 필드: `id, title, year, director, tmdbId, scenes(≥1)`.
- 모든 외부 호출은 주입 가능한 인터페이스 뒤에 둔다(테스트는 fixture, 실제는 live). 순수 함수에 네트워크 호출을 섞지 않는다.
- API 키는 환경변수로만: `TMDB_API_KEY`, `ANTHROPIC_API_KEY`. 코드/리포에 키 하드코딩 금지. `.env`는 gitignore(이미 `.env*` 무시됨).
- LLM 모델: 비용 효율 위해 `claude-haiku-4-5-20251001` 사용(장면 태깅은 짧은 분류·요약 작업). SDK = `@anthropic-ai/sdk`.
- Wikidata SPARQL 엔드포인트: `https://query.wikidata.org/sparql` (GET, `format=json`, User-Agent 헤더 필수 — Wikidata 정책). 속성: 촬영지 `P915`, 좌표 `P625`, TMDB movie id `P4947`.
- `nowUrl`(현장 현재 사진)은 자동 소스가 불확실하므로 v2 자동화 범위. 이번 파이프라인은 `nowUrl`을 placeholder(stillUrl과 동일하거나 빈 자리표시 URL)로 채우고, 사람이 나중에 교체하도록 `needsNowPhoto: true` 플래그를 ingest 로그에 남긴다. (스키마는 변경하지 않는다 — placeholder도 유효 https URL.)
- 패키지 매니저 npm. 커밋 prefix: feat/test/chore. 작업 단위마다 커밋.
- 작업 루트: `C:/Users/user/Desktop/movie-map/`. 모든 경로 상대.
- 멱등성: 같은 tmdbId를 다시 ingest하면 중복 추가가 아니라 기존 항목을 교체한다.

## File Structure

| 파일 | 책임 |
|---|---|
| `scripts/ingest/types.ts` | ingest 내부 타입 + 주입용 인터페이스(Fetcher들) |
| `scripts/ingest/wikidata.ts` | SPARQL 쿼리 빌더 + 응답 파서(tmdbId → 촬영지 좌표 목록) |
| `scripts/ingest/tmdb.ts` | TMDB 메타데이터·이미지 응답 파서(URL 조립 포함) |
| `scripts/ingest/sceneTagger.ts` | LLM 프롬프트 빌더 + 응답 파서(촬영지 → 장면 노트) |
| `scripts/ingest/assemble.ts` | 좌표+스틸+노트 → Scene[]/Film 조립 + parseFilms 검증 |
| `scripts/ingest/merge.ts` | data/films.json 멱등 병합(tmdbId 기준 교체) |
| `scripts/ingest/run.ts` | CLI 엔트리(`--tmdb <id>`), 실제 fetcher 주입, 로깅 |
| `scripts/ingest/__tests__/*.test.ts` | 순수 함수 fixture 테스트 |
| `scripts/ingest/__fixtures__/*.json` | Wikidata/TMDB/LLM 응답 샘플 |
| `package.json` | `ingest` 스크립트 + tsx/@anthropic-ai/sdk 의존성 |

---

### Task 1: Ingest 스캐폴드 + 주입 인터페이스

**Files:**
- Modify: `package.json` (add `tsx`, `@anthropic-ai/sdk` devDep; add `"ingest": "tsx scripts/ingest/run.ts"` script)
- Create: `scripts/ingest/types.ts`
- Create: `.env.example`
- Test: `scripts/ingest/__tests__/types.test.ts`

**Interfaces:**
- Consumes: 기존 `Scene`, `Film` (src/lib/types.ts)
- Produces:
  - `type RawLocation = { name: string; lat: number; lng: number }`
  - `type FilmMeta = { title: string; year: number; director: string; tmdbId: number; stillUrls: string[] }`
  - `type TaggedScene = { name: string; note: string; bearing: number }`
  - `interface WikidataFetcher { locations(tmdbId: number): Promise<RawLocation[]> }`
  - `interface TmdbFetcher { meta(tmdbId: number): Promise<FilmMeta> }`
  - `interface SceneTagger { tag(filmTitle: string, loc: RawLocation): Promise<TaggedScene> }`

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/ingest/__tests__/types.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { makeFilmId } from "@/../scripts/ingest/types";

describe("makeFilmId", () => {
  it("slugifies a title into a stable id", () => {
    expect(makeFilmId("Call Me By Your Name")).toBe("call-me-by-your-name");
  });
  it("strips punctuation and collapses spaces", () => {
    expect(makeFilmId("  Amélie:  Le Fabuleux! ")).toBe("amelie-le-fabuleux");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- ingest/__tests__/types`
Expected: FAIL — module not found.

- [ ] **Step 3: 의존성·스크립트 추가**

`package.json`의 `devDependencies`에 추가: `"tsx": "4.19.2"`. `dependencies`에 추가: `"@anthropic-ai/sdk": "0.39.0"`. `scripts`에 추가: `"ingest": "tsx scripts/ingest/run.ts"`. 그 후 `npm install`.

- [ ] **Step 4: 타입·헬퍼 구현**

`scripts/ingest/types.ts`:
```typescript
import type { Scene, Film } from "@/lib/types";

export type RawLocation = { name: string; lat: number; lng: number };
export type FilmMeta = { title: string; year: number; director: string; tmdbId: number; stillUrls: string[] };
export type TaggedScene = { name: string; note: string; bearing: number };

export interface WikidataFetcher { locations(tmdbId: number): Promise<RawLocation[]> }
export interface TmdbFetcher { meta(tmdbId: number): Promise<FilmMeta> }
export interface SceneTagger { tag(filmTitle: string, loc: RawLocation): Promise<TaggedScene> }

export type { Scene, Film };

export function makeFilmId(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 5: .env.example 작성**

`.env.example`:
```
TMDB_API_KEY=your_tmdb_v3_api_key
ANTHROPIC_API_KEY=your_anthropic_key
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm test -- ingest/__tests__/types`
Expected: 2 tests PASS.

- [ ] **Step 7: 커밋**

```bash
git add package.json package-lock.json scripts/ingest/types.ts scripts/ingest/__tests__/types.test.ts .env.example
git commit -m "chore: scaffold ingest pipeline scaffolding and injection interfaces"
```

---

### Task 2: Wikidata SPARQL 클라이언트 (쿼리 빌더 + 파서)

**Files:**
- Create: `scripts/ingest/wikidata.ts`
- Create: `scripts/ingest/__fixtures__/wikidata-cmbyn.json`
- Test: `scripts/ingest/__tests__/wikidata.test.ts`

**Interfaces:**
- Consumes: `RawLocation` (Task 1)
- Produces:
  - `buildSparql(tmdbId: number): string` — TMDB id로 영화를 찾아 촬영지+좌표를 반환하는 SPARQL.
  - `parseWikidata(json: unknown): RawLocation[]` — SPARQL JSON → RawLocation[] (좌표 `Point(lng lat)` WKT 파싱, 중복 좌표 제거).
  - `makeWikidataFetcher(fetchFn): WikidataFetcher` — 주입형 실제 클라이언트.

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/ingest/__tests__/wikidata.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { buildSparql, parseWikidata } from "@/../scripts/ingest/wikidata";
import fixture from "@/../scripts/ingest/__fixtures__/wikidata-cmbyn.json";

describe("buildSparql", () => {
  it("embeds the TMDB id and asks for P915 filming locations with P625 coords", () => {
    const q = buildSparql(398818);
    expect(q).toContain("398818");
    expect(q).toContain("P915");
    expect(q).toContain("P625");
  });
});

describe("parseWikidata", () => {
  it("parses WKT Point(lng lat) bindings into RawLocation with lat/lng", () => {
    const locs = parseWikidata(fixture);
    expect(locs.length).toBeGreaterThanOrEqual(1);
    const crema = locs.find((l) => l.name.includes("Crema"));
    expect(crema).toBeDefined();
    expect(crema!.lat).toBeCloseTo(45.36, 1);
    expect(crema!.lng).toBeCloseTo(9.68, 1);
  });

  it("deduplicates identical coordinates", () => {
    const locs = parseWikidata(fixture);
    const keys = locs.map((l) => `${l.lat},${l.lng}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
```

- [ ] **Step 2: fixture 작성**

`scripts/ingest/__fixtures__/wikidata-cmbyn.json` (SPARQL JSON 응답 형태, 좌표는 `Point(lng lat)`):
```json
{
  "results": {
    "bindings": [
      { "placeLabel": { "value": "Crema" }, "coord": { "value": "Point(9.6859 45.3628)" } },
      { "placeLabel": { "value": "Crema" }, "coord": { "value": "Point(9.6859 45.3628)" } },
      { "placeLabel": { "value": "Bergamo" }, "coord": { "value": "Point(9.6614 45.7038)" } }
    ]
  }
}
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- ingest/__tests__/wikidata`
Expected: FAIL — module not found.

- [ ] **Step 4: 구현**

`scripts/ingest/wikidata.ts`:
```typescript
import type { RawLocation, WikidataFetcher } from "./types";

const ENDPOINT = "https://query.wikidata.org/sparql";

export function buildSparql(tmdbId: number): string {
  return `
SELECT ?placeLabel ?coord WHERE {
  ?film wdt:P4947 "${tmdbId}" .
  ?film wdt:P915 ?place .
  ?place wdt:P625 ?coord .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,it,fr,ko". }
}`.trim();
}

export function parseWikidata(json: unknown): RawLocation[] {
  const bindings =
    (json as { results?: { bindings?: Array<Record<string, { value: string }>> } })
      ?.results?.bindings ?? [];
  const out: RawLocation[] = [];
  const seen = new Set<string>();
  for (const b of bindings) {
    const name = b.placeLabel?.value;
    const wkt = b.coord?.value;
    if (!name || !wkt) continue;
    const m = wkt.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
    if (!m) continue;
    const lng = Number(m[1]);
    const lat = Number(m[2]);
    const key = `${lat},${lng}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, lat, lng });
  }
  return out;
}

export function makeWikidataFetcher(
  fetchFn: typeof fetch = fetch,
): WikidataFetcher {
  return {
    async locations(tmdbId: number): Promise<RawLocation[]> {
      const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(buildSparql(tmdbId))}`;
      const res = await fetchFn(url, {
        headers: {
          Accept: "application/sparql-results+json",
          "User-Agent": "CinescapeIngest/1.0 (https://github.com/tkddnjs-dlqslek/cinescape)",
        },
      });
      if (!res.ok) throw new Error(`Wikidata ${res.status}`);
      return parseWikidata(await res.json());
    },
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- ingest/__tests__/wikidata`
Expected: 3 tests PASS.

- [ ] **Step 6: 커밋**

```bash
git add scripts/ingest/wikidata.ts scripts/ingest/__fixtures__/wikidata-cmbyn.json scripts/ingest/__tests__/wikidata.test.ts
git commit -m "feat: add Wikidata SPARQL query builder and parser for filming locations"
```

---

### Task 3: TMDB 클라이언트 (메타데이터 + 이미지 URL 파서)

**Files:**
- Create: `scripts/ingest/tmdb.ts`
- Create: `scripts/ingest/__fixtures__/tmdb-cmbyn.json`
- Test: `scripts/ingest/__tests__/tmdb.test.ts`

**Interfaces:**
- Consumes: `FilmMeta` (Task 1)
- Produces:
  - `parseTmdb(detail: unknown, images: unknown): FilmMeta` — TMDB `/movie/{id}?append_to_response=credits,images` 응답 → FilmMeta. director는 credits.crew에서 `job==="Director"`. stillUrls는 images.backdrops의 `file_path`를 `https://image.tmdb.org/t/p/w1280{path}`로 조립(최대 8장).
  - `makeTmdbFetcher(apiKey, fetchFn): TmdbFetcher`.

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/ingest/__tests__/tmdb.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseTmdb } from "@/../scripts/ingest/tmdb";
import detail from "@/../scripts/ingest/__fixtures__/tmdb-cmbyn.json";

describe("parseTmdb", () => {
  it("extracts title, year, director, tmdbId and builds full image URLs", () => {
    const meta = parseTmdb(detail, (detail as { images: unknown }).images);
    expect(meta.title).toBe("Call Me by Your Name");
    expect(meta.year).toBe(2017);
    expect(meta.director).toBe("Luca Guadagnino");
    expect(meta.tmdbId).toBe(398818);
    expect(meta.stillUrls[0]).toBe("https://image.tmdb.org/t/p/w1280/abc.jpg");
    expect(meta.stillUrls.length).toBeLessThanOrEqual(8);
  });
});
```

- [ ] **Step 2: fixture 작성**

`scripts/ingest/__fixtures__/tmdb-cmbyn.json`:
```json
{
  "id": 398818,
  "title": "Call Me by Your Name",
  "release_date": "2017-11-24",
  "credits": { "crew": [{ "job": "Director", "name": "Luca Guadagnino" }, { "job": "Writer", "name": "James Ivory" }] },
  "images": { "backdrops": [{ "file_path": "/abc.jpg" }, { "file_path": "/def.jpg" }] }
}
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- ingest/__tests__/tmdb`
Expected: FAIL — module not found.

- [ ] **Step 4: 구현**

`scripts/ingest/tmdb.ts`:
```typescript
import type { FilmMeta, TmdbFetcher } from "./types";

const IMG_BASE = "https://image.tmdb.org/t/p/w1280";

export function parseTmdb(detail: unknown, images: unknown): FilmMeta {
  const d = detail as {
    id: number; title: string; release_date?: string;
    credits?: { crew?: Array<{ job: string; name: string }> };
  };
  const img = images as { backdrops?: Array<{ file_path: string }> };
  const director =
    d.credits?.crew?.find((c) => c.job === "Director")?.name ?? "Unknown";
  const year = d.release_date ? Number(d.release_date.slice(0, 4)) : 0;
  const stillUrls = (img.backdrops ?? [])
    .slice(0, 8)
    .map((b) => `${IMG_BASE}${b.file_path}`);
  return { title: d.title, year, director, tmdbId: d.id, stillUrls };
}

export function makeTmdbFetcher(apiKey: string, fetchFn: typeof fetch = fetch): TmdbFetcher {
  return {
    async meta(tmdbId: number): Promise<FilmMeta> {
      const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits,images`;
      const res = await fetchFn(url);
      if (!res.ok) throw new Error(`TMDB ${res.status}`);
      const detail = await res.json();
      return parseTmdb(detail, (detail as { images: unknown }).images);
    },
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- ingest/__tests__/tmdb`
Expected: 1 test PASS.

- [ ] **Step 6: 커밋**

```bash
git add scripts/ingest/tmdb.ts scripts/ingest/__fixtures__/tmdb-cmbyn.json scripts/ingest/__tests__/tmdb.test.ts
git commit -m "feat: add TMDB metadata and image URL parser"
```

---

### Task 4: LLM 장면 태거 (프롬프트 빌더 + 응답 파서)

**Files:**
- Create: `scripts/ingest/sceneTagger.ts`
- Test: `scripts/ingest/__tests__/sceneTagger.test.ts`

**Interfaces:**
- Consumes: `RawLocation`, `TaggedScene`, `SceneTagger` (Task 1)
- Produces:
  - `buildTagPrompt(filmTitle: string, loc: RawLocation): string`
  - `parseTagResponse(text: string): TaggedScene` — LLM의 JSON 텍스트 `{ "note": "...", "bearing": 120 }`를 파싱; bearing 누락/범위 밖이면 0으로 보정, name은 loc.name 유지.
  - `makeSceneTagger(client, loc→name): SceneTagger` — Anthropic SDK 주입형.

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/ingest/__tests__/sceneTagger.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { buildTagPrompt, parseTagResponse } from "@/../scripts/ingest/sceneTagger";

describe("buildTagPrompt", () => {
  it("includes the film title and location name and asks for JSON", () => {
    const p = buildTagPrompt("Call Me By Your Name", { name: "Crema", lat: 45.36, lng: 9.68 });
    expect(p).toContain("Call Me By Your Name");
    expect(p).toContain("Crema");
    expect(p.toLowerCase()).toContain("json");
  });
});

describe("parseTagResponse", () => {
  it("parses a JSON note + bearing", () => {
    const t = parseTagResponse('{"note":"광장을 가로지르던 아침","bearing":120}');
    expect(t.note).toContain("광장");
    expect(t.bearing).toBe(120);
  });
  it("tolerates surrounding prose and code fences", () => {
    const t = parseTagResponse('여기요:\n```json\n{"note":"강가","bearing":30}\n```');
    expect(t.bearing).toBe(30);
  });
  it("clamps an out-of-range or missing bearing to 0", () => {
    expect(parseTagResponse('{"note":"x","bearing":999}').bearing).toBe(0);
    expect(parseTagResponse('{"note":"x"}').bearing).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- ingest/__tests__/sceneTagger`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

`scripts/ingest/sceneTagger.ts`:
```typescript
import type Anthropic from "@anthropic-ai/sdk";
import type { RawLocation, TaggedScene, SceneTagger } from "./types";

export function buildTagPrompt(filmTitle: string, loc: RawLocation): string {
  return [
    `영화 "${filmTitle}"의 촬영지 "${loc.name}" (위도 ${loc.lat}, 경도 ${loc.lng})에 대해,`,
    `시네필 여행자를 위한 한국어 장면 설명을 작성하세요.`,
    `반드시 아래 JSON만 출력하세요(다른 텍스트 금지):`,
    `{"note": "이 장소에서 일어난 인상적인 장면 한 문장(한국어)", "bearing": 카메라가 향한 대략 방위각 0-360 정수(모르면 0)}`,
  ].join("\n");
}

export function parseTagResponse(text: string): TaggedScene {
  const m = text.match(/\{[\s\S]*\}/);
  let note = "";
  let bearing = 0;
  if (m) {
    try {
      const obj = JSON.parse(m[0]) as { note?: string; bearing?: number };
      note = typeof obj.note === "string" ? obj.note : "";
      const b = typeof obj.bearing === "number" ? obj.bearing : 0;
      bearing = b >= 0 && b <= 360 ? Math.round(b) : 0;
    } catch {
      /* fall through to defaults */
    }
  }
  return { name: "", note, bearing };
}

export function makeSceneTagger(client: Anthropic): SceneTagger {
  return {
    async tag(filmTitle: string, loc: RawLocation): Promise<TaggedScene> {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: buildTagPrompt(filmTitle, loc) }],
      });
      const text = msg.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
      const parsed = parseTagResponse(text);
      return { ...parsed, name: loc.name };
    },
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- ingest/__tests__/sceneTagger`
Expected: 4 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/ingest/sceneTagger.ts scripts/ingest/__tests__/sceneTagger.test.ts
git commit -m "feat: add LLM scene tagger prompt builder and tolerant JSON parser"
```

---

### Task 5: 조립기 (좌표+스틸+노트 → Film, 스키마 검증)

**Files:**
- Create: `scripts/ingest/assemble.ts`
- Test: `scripts/ingest/__tests__/assemble.test.ts`

**Interfaces:**
- Consumes: `RawLocation`, `FilmMeta`, `TaggedScene`, `Film`, `Scene` (Task 1), `makeFilmId` (Task 1), `parseFilms` (src/lib/types)
- Produces:
  - `assembleFilm(meta: FilmMeta, locations: RawLocation[], tags: TaggedScene[]): Film` — 각 location i를 Scene으로: `id = ${filmId}-${slug(name)}`, `name = tags[i].name || location.name`, `note = tags[i].note`, `coord = {lat,lng}`, `stillUrl = meta.stillUrls[i % stillUrls.length]`(없으면 placeholder), `nowUrl = stillUrl`(placeholder, v2 교체), `bearing = tags[i].bearing`. 결과를 `parseFilms([film])`로 검증해 무효 데이터를 즉시 차단.

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/ingest/__tests__/assemble.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { assembleFilm } from "@/../scripts/ingest/assemble";
import type { FilmMeta, RawLocation, TaggedScene } from "@/../scripts/ingest/types";

const meta: FilmMeta = {
  title: "Call Me By Your Name", year: 2017, director: "Luca Guadagnino",
  tmdbId: 398818, stillUrls: ["https://image.tmdb.org/t/p/w1280/a.jpg"],
};
const locs: RawLocation[] = [
  { name: "Crema", lat: 45.3628, lng: 9.6859 },
  { name: "Bergamo", lat: 45.7038, lng: 9.6614 },
];
const tags: TaggedScene[] = [
  { name: "Crema", note: "광장 아침", bearing: 120 },
  { name: "Bergamo", note: "당일치기", bearing: 30 },
];

describe("assembleFilm", () => {
  it("builds a schema-valid Film with one scene per location", () => {
    const film = assembleFilm(meta, locs, tags);
    expect(film.id).toBe("call-me-by-your-name");
    expect(film.scenes).toHaveLength(2);
    expect(film.scenes[0].id).toBe("call-me-by-your-name-crema");
    expect(film.scenes[0].note).toBe("광장 아침");
    expect(film.scenes[0].coord).toEqual({ lat: 45.3628, lng: 9.6859 });
  });

  it("reuses still URLs cyclically when there are more locations than stills", () => {
    const film = assembleFilm(meta, locs, tags);
    expect(film.scenes[0].stillUrl).toBe("https://image.tmdb.org/t/p/w1280/a.jpg");
    expect(film.scenes[1].stillUrl).toBe("https://image.tmdb.org/t/p/w1280/a.jpg");
  });

  it("throws (via parseFilms) when no valid scenes exist", () => {
    expect(() => assembleFilm(meta, [], [])).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- ingest/__tests__/assemble`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

`scripts/ingest/assemble.ts`:
```typescript
import { parseFilms, type Film, type Scene } from "@/lib/types";
import { makeFilmId, type FilmMeta, type RawLocation, type TaggedScene } from "./types";

const PLACEHOLDER_STILL = "https://picsum.photos/seed/cinescape-placeholder/1200/750";

function slug(s: string): string {
  return makeFilmId(s);
}

export function assembleFilm(
  meta: FilmMeta,
  locations: RawLocation[],
  tags: TaggedScene[],
): Film {
  const filmId = makeFilmId(meta.title);
  const stills = meta.stillUrls.length > 0 ? meta.stillUrls : [PLACEHOLDER_STILL];
  const scenes: Scene[] = locations.map((loc, i) => {
    const tag = tags[i] ?? { name: loc.name, note: "", bearing: 0 };
    const stillUrl = stills[i % stills.length];
    return {
      id: `${filmId}-${slug(loc.name)}`,
      name: tag.name || loc.name,
      note: tag.note,
      coord: { lat: loc.lat, lng: loc.lng },
      stillUrl,
      nowUrl: stillUrl, // placeholder — flagged for manual replacement (Global Constraints)
      bearing: tag.bearing,
    };
  });
  const film: Film = {
    id: filmId,
    title: meta.title,
    year: meta.year,
    director: meta.director,
    tmdbId: meta.tmdbId,
    scenes,
  };
  // Validate against the SAME schema the app uses. Throws on any invalid field
  // (e.g. empty scenes, bad URL, out-of-range coord) — fail fast, never emit bad data.
  return parseFilms([film])[0];
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- ingest/__tests__/assemble`
Expected: 3 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/ingest/assemble.ts scripts/ingest/__tests__/assemble.test.ts
git commit -m "feat: assemble locations+stills+tags into a schema-validated Film"
```

---

### Task 6: 멱등 병합 + CLI 러너

**Files:**
- Create: `scripts/ingest/merge.ts`
- Create: `scripts/ingest/run.ts`
- Test: `scripts/ingest/__tests__/merge.test.ts`

**Interfaces:**
- Consumes: `Film` (Task 1), `parseFilms` (src/lib/types), `assembleFilm` (Task 5), `makeWikidataFetcher` (Task 2), `makeTmdbFetcher` (Task 3), `makeSceneTagger` (Task 4)
- Produces:
  - `mergeFilms(existing: Film[], incoming: Film): Film[]` — 같은 `tmdbId`(또는 같은 `id`)면 교체, 아니면 추가. 순수 함수.
  - `run.ts` — `--tmdb <id>` 인자를 읽어 실제 fetcher들을 주입, 한 영화를 ingest해 `data/films.json`에 병합 저장. `nowUrl`이 placeholder인 장면 수를 로그로 경고.

- [ ] **Step 1: 실패하는 테스트 작성 (merge 순수 함수)**

`scripts/ingest/__tests__/merge.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { mergeFilms } from "@/../scripts/ingest/merge";
import type { Film } from "@/lib/types";

const mk = (id: string, tmdbId: number, title: string): Film => ({
  id, title, year: 2000, director: "D", tmdbId,
  scenes: [{ id: `${id}-s`, name: "S", note: "", coord: { lat: 1, lng: 1 }, stillUrl: "https://e.com/a.jpg", nowUrl: "https://e.com/a.jpg", bearing: 0 }],
});

describe("mergeFilms", () => {
  it("appends a new film", () => {
    const out = mergeFilms([mk("a", 1, "A")], mk("b", 2, "B"));
    expect(out.map((f) => f.id)).toEqual(["a", "b"]);
  });
  it("replaces an existing film with the same tmdbId (idempotent re-ingest)", () => {
    const out = mergeFilms([mk("a", 1, "A")], mk("a", 1, "A v2"));
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("A v2");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- ingest/__tests__/merge`
Expected: FAIL — module not found.

- [ ] **Step 3: merge 구현**

`scripts/ingest/merge.ts`:
```typescript
import type { Film } from "@/lib/types";

export function mergeFilms(existing: Film[], incoming: Film): Film[] {
  const idx = existing.findIndex(
    (f) => f.tmdbId === incoming.tmdbId || f.id === incoming.id,
  );
  if (idx === -1) return [...existing, incoming];
  const copy = existing.slice();
  copy[idx] = incoming;
  return copy;
}
```

- [ ] **Step 4: CLI 러너 구현**

`scripts/ingest/run.ts`:
```typescript
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { parseFilms, type Film } from "@/lib/types";
import { makeWikidataFetcher } from "./wikidata";
import { makeTmdbFetcher } from "./tmdb";
import { makeSceneTagger } from "./sceneTagger";
import { assembleFilm } from "./assemble";
import { mergeFilms } from "./merge";

const PLACEHOLDER_STILL = "https://picsum.photos/seed/cinescape-placeholder/1200/750";

async function main() {
  const arg = process.argv.indexOf("--tmdb");
  const tmdbId = arg !== -1 ? Number(process.argv[arg + 1]) : NaN;
  if (!Number.isFinite(tmdbId)) {
    console.error("Usage: npm run ingest -- --tmdb <tmdbId>");
    process.exit(1);
  }
  const tmdbKey = process.env.TMDB_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!tmdbKey || !anthropicKey) {
    console.error("Set TMDB_API_KEY and ANTHROPIC_API_KEY in .env");
    process.exit(1);
  }

  const wiki = makeWikidataFetcher();
  const tmdb = makeTmdbFetcher(tmdbKey);
  const tagger = makeSceneTagger(new Anthropic({ apiKey: anthropicKey }));

  console.log(`[ingest] tmdb=${tmdbId}: fetching locations + meta...`);
  const [locations, meta] = await Promise.all([wiki.locations(tmdbId), tmdb.meta(tmdbId)]);
  console.log(`[ingest] ${locations.length} locations, ${meta.stillUrls.length} stills for "${meta.title}"`);
  if (locations.length === 0) {
    console.error(`[ingest] no Wikidata filming locations for tmdb=${tmdbId} — skipping.`);
    process.exit(1);
  }

  const tags = [];
  for (const loc of locations) {
    tags.push(await tagger.tag(meta.title, loc));
  }

  const film = assembleFilm(meta, locations, tags);
  const placeholderNow = film.scenes.filter((s) => s.nowUrl === s.stillUrl || s.nowUrl === PLACEHOLDER_STILL).length;

  const dataPath = resolve(process.cwd(), "data/films.json");
  const existing: Film[] = parseFilms(JSON.parse(readFileSync(dataPath, "utf8")));
  const merged = mergeFilms(existing, film);
  parseFilms(merged); // final integrity gate
  writeFileSync(dataPath, JSON.stringify(merged, null, 2) + "\n", "utf8");

  console.log(`[ingest] wrote "${film.title}" (${film.scenes.length} scenes) → data/films.json`);
  console.warn(`[ingest] ⚠ ${placeholderNow}/${film.scenes.length} scenes need a real "now" photo (nowUrl is placeholder).`);
}

main().catch((e) => {
  console.error("[ingest] failed:", e);
  process.exit(1);
});
```

- [ ] **Step 5: merge 테스트 통과 확인**

Run: `npm test -- ingest/__tests__/merge`
Expected: 2 tests PASS. 그리고 전체 `npm test`로 무회귀 확인.

- [ ] **Step 6: 커밋**

```bash
git add scripts/ingest/merge.ts scripts/ingest/run.ts scripts/ingest/__tests__/merge.test.ts
git commit -m "feat: idempotent film merge and ingest CLI runner"
```

- [ ] **Step 7: 수동 실 검증 (키 필요 — 사용자 승인 후)**

`.env`에 실제 키 설정 후:
```bash
npm run ingest -- --tmdb 76   # Before Sunrise — Wikidata에 촬영지 좌표 존재 여부 확인
```
기대: 촬영지 N개 + 스틸 + 한국어 노트로 `data/films.json`에 추가/교체, placeholder now 경고 출력. 앱(`npm run dev`)에서 해당 영화가 글로브에 뜨는지 확인. (Wikidata에 좌표 없으면 "skipping" — 이는 데이터 가용성 한계로 정상.)

---

## Self-Review

**1. Spec coverage:**
- Wikidata SPARQL(P915/P625/P4947) → Task 2 ✅
- TMDB 메타+스틸 → Task 3 ✅
- LLM 장면 태깅(claude-haiku-4-5) → Task 4 ✅
- 기존 zod 스키마 재사용 검증 → Task 5(assembleFilm은 parseFilms로 검증) ✅
- 멱등 병합 → Task 6(mergeFilms tmdbId 교체) ✅
- nowUrl placeholder + 경고 플래그 → Task 5(nowUrl=stillUrl) + Task 6(경고 로그) ✅
- 주입형 인터페이스(테스트 fixture) → Task 1 인터페이스 + Task 2-4 makeXFetcher ✅
- API 키 env 전용 → Task 1 .env.example + Task 6 env 체크 ✅

**2. Placeholder scan:** 모든 코드 스텝에 실제 코드. "TODO" 없음. nowUrl placeholder는 의도적 설계(스키마 유지 + 사람 교체 플래그)로 명시. ✅

**3. Type consistency:**
- `RawLocation/FilmMeta/TaggedScene` (Task 1) → Task 2/3/4/5에서 동일 사용. ✅
- `WikidataFetcher.locations/TmdbFetcher.meta/SceneTagger.tag` 시그니처 → Task 2/3/4 make* 구현 + Task 6 호출 일치. ✅
- `assembleFilm(meta, locations, tags): Film` → Task 5 정의, Task 6 호출 일치. ✅
- `mergeFilms(existing, incoming): Film[]` → Task 6 정의·사용 일치. ✅
- `makeFilmId` (Task 1) → Task 5 slug/filmId에서 사용. ✅
- 출력 `Film/Scene`은 v1 `src/lib/types.ts`와 동일(재사용). ✅

이슈 없음.

---

## Phase 2b — "Now" 현장 사진 자동화 (Wikimedia Commons)

**추가 목표:** 각 촬영지 좌표 근처의 **자유 라이선스 실제 현장 사진**을 Wikimedia Commons에서 찾아 `nowUrl`을 placeholder 대신 진짜로 채운다. Then/Now 슬라이더 오른쪽이 진짜가 된다. 키 불필요(Commons 공개 API).

**추가 Global Constraint:** Commons 엔드포인트 `https://commons.wikimedia.org/w/api.php` (GET, `format=json`, `origin=*`, User-Agent 헤더). geosearch는 namespace 6(File), 반경 최대 10000m. 찾은 이미지가 없으면 `nowUrl`은 기존 placeholder(=stillUrl)로 폴백(스키마 유지). 이미지 URL은 `upload.wikimedia.org` https(zod url() 통과).

### Task 7: Wikimedia Commons "now" 사진 페처

**Files:**
- Create: `scripts/ingest/commons.ts`
- Create: `scripts/ingest/__fixtures__/commons-geosearch.json`, `scripts/ingest/__fixtures__/commons-imageinfo.json`
- Test: `scripts/ingest/__tests__/commons.test.ts`

**Interfaces:**
- Consumes: `RawLocation` (Task 1)
- Produces:
  - `interface NowPhotoFetcher { now(loc: RawLocation): Promise<string | null> }` (types.ts에 추가)
  - `buildGeosearchUrl(lat, lng): string`, `parseGeosearch(json): string[]` (File: 제목, 이미지 확장자만)
  - `buildImageInfoUrl(title): string`, `parseImageInfo(json): string | null` (첫 imageinfo url)
  - `makeCommonsFetcher(fetchFn): NowPhotoFetcher`

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/ingest/__tests__/commons.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { buildGeosearchUrl, parseGeosearch, buildImageInfoUrl, parseImageInfo } from "@/../scripts/ingest/commons";
import geo from "@/../scripts/ingest/__fixtures__/commons-geosearch.json";
import info from "@/../scripts/ingest/__fixtures__/commons-imageinfo.json";

describe("buildGeosearchUrl", () => {
  it("embeds coords, File namespace 6, and json format", () => {
    const u = buildGeosearchUrl(45.36, 9.68);
    expect(u).toContain("45.36");
    expect(u).toContain("9.68");
    expect(u).toContain("gsnamespace=6");
    expect(u).toContain("format=json");
  });
});

describe("parseGeosearch", () => {
  it("returns File titles, keeping only image files", () => {
    const titles = parseGeosearch(geo);
    expect(titles.length).toBeGreaterThanOrEqual(1);
    expect(titles.every((t) => /\.(jpe?g|png)$/i.test(t))).toBe(true);
  });
});

describe("parseImageInfo", () => {
  it("returns the first image url", () => {
    expect(parseImageInfo(info)).toBe("https://upload.wikimedia.org/wikipedia/commons/a/ab/Crema.jpg");
  });
  it("returns null when no pages have imageinfo", () => {
    expect(parseImageInfo({ query: { pages: {} } })).toBeNull();
  });
});

describe("buildImageInfoUrl", () => {
  it("embeds the title and iiprop=url", () => {
    const u = buildImageInfoUrl("File:Crema.jpg");
    expect(u).toContain("Crema");
    expect(u).toContain("iiprop=url");
  });
});
```

- [ ] **Step 2: fixtures 작성**

`scripts/ingest/__fixtures__/commons-geosearch.json`:
```json
{ "query": { "geosearch": [
  { "title": "File:Crema.jpg", "lat": 45.3628, "lon": 9.6859, "dist": 20 },
  { "title": "File:Crema map.svg", "lat": 45.3629, "lon": 9.6860, "dist": 40 },
  { "title": "File:Piazza Duomo Crema.jpeg", "lat": 45.3630, "lon": 9.6861, "dist": 55 }
] } }
```
`scripts/ingest/__fixtures__/commons-imageinfo.json`:
```json
{ "query": { "pages": { "12345": { "title": "File:Crema.jpg", "imageinfo": [ { "url": "https://upload.wikimedia.org/wikipedia/commons/a/ab/Crema.jpg" } ] } } } }
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- ingest/__tests__/commons`
Expected: FAIL — module not found.

- [ ] **Step 4: 구현**

먼저 `scripts/ingest/types.ts`에 인터페이스 추가:
```typescript
export interface NowPhotoFetcher { now(loc: RawLocation): Promise<string | null> }
```

`scripts/ingest/commons.ts`:
```typescript
import type { RawLocation, NowPhotoFetcher } from "./types";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "CinescapeIngest/1.0 (https://github.com/tkddnjs-dlqslek/cinescape)";

export function buildGeosearchUrl(lat: number, lng: number): string {
  const p = new URLSearchParams({
    action: "query", list: "geosearch",
    gscoord: `${lat}|${lng}`, gsradius: "2000", gsnamespace: "6",
    gslimit: "10", format: "json", origin: "*",
  });
  return `${API}?${p.toString()}`;
}

export function parseGeosearch(json: unknown): string[] {
  const arr = (json as { query?: { geosearch?: Array<{ title: string }> } })?.query?.geosearch ?? [];
  return arr.map((g) => g.title).filter((t) => /\.(jpe?g|png)$/i.test(t));
}

export function buildImageInfoUrl(title: string): string {
  const p = new URLSearchParams({
    action: "query", titles: title, prop: "imageinfo",
    iiprop: "url", format: "json", origin: "*",
  });
  return `${API}?${p.toString()}`;
}

export function parseImageInfo(json: unknown): string | null {
  const pages = (json as { query?: { pages?: Record<string, { imageinfo?: Array<{ url: string }> }> } })?.query?.pages ?? {};
  for (const page of Object.values(pages)) {
    const url = page.imageinfo?.[0]?.url;
    if (url) return url;
  }
  return null;
}

export function makeCommonsFetcher(fetchFn: typeof fetch = fetch): NowPhotoFetcher {
  return {
    async now(loc: RawLocation): Promise<string | null> {
      const geoRes = await fetchFn(buildGeosearchUrl(loc.lat, loc.lng), { headers: { "User-Agent": UA } });
      if (!geoRes.ok) return null;
      const titles = parseGeosearch(await geoRes.json());
      if (titles.length === 0) return null;
      const infoRes = await fetchFn(buildImageInfoUrl(titles[0]), { headers: { "User-Agent": UA } });
      if (!infoRes.ok) return null;
      return parseImageInfo(await infoRes.json());
    },
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- ingest/__tests__/commons`
Expected: 5 tests PASS. 그리고 전체 `npm test` 무회귀.

- [ ] **Step 6: 커밋**

```bash
git add scripts/ingest/commons.ts scripts/ingest/types.ts scripts/ingest/__fixtures__/commons-geosearch.json scripts/ingest/__fixtures__/commons-imageinfo.json scripts/ingest/__tests__/commons.test.ts
git commit -m "feat: add Wikimedia Commons now-photo fetcher"
```

---

### Task 8: 조립기 nowUrl 주입 + run.ts 배선

**Files:**
- Modify: `scripts/ingest/assemble.ts` (assembleFilm에 선택적 `nowUrls` 파라미터 추가 — 하위호환)
- Modify: `scripts/ingest/run.ts` (Commons 페처로 location별 now 사진 조회 후 assembleFilm에 전달, 경고 갱신)
- Test: `scripts/ingest/__tests__/assemble.test.ts` (nowUrls 케이스 추가)

**Interfaces:**
- Consumes: `assembleFilm` (Task 5), `makeCommonsFetcher`/`NowPhotoFetcher` (Task 7)
- Produces: `assembleFilm(meta, locations, tags, nowUrls?): Film` — `nowUrls[i]`가 있으면 그 scene의 `nowUrl`로 사용, 없으면(undefined/null) 기존 placeholder(=stillUrl).

- [ ] **Step 1: 실패하는 테스트 작성 (assemble.test.ts에 추가)**

```typescript
it("uses provided nowUrls when present, placeholder otherwise", () => {
  const film = assembleFilm(meta, locs, tags, ["https://upload.wikimedia.org/x.jpg", null]);
  expect(film.scenes[0].nowUrl).toBe("https://upload.wikimedia.org/x.jpg");
  expect(film.scenes[1].nowUrl).toBe(film.scenes[1].stillUrl); // null → placeholder
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- ingest/__tests__/assemble`
Expected: 새 테스트 FAIL (nowUrls 파라미터 미지원).

- [ ] **Step 3: assembleFilm 수정**

`scripts/ingest/assemble.ts`의 시그니처와 nowUrl 라인만 변경(하위호환 — 4번째 인자 선택적):
```typescript
export function assembleFilm(
  meta: FilmMeta,
  locations: RawLocation[],
  tags: TaggedScene[],
  nowUrls?: (string | null)[],
): Film {
```
그리고 scene 생성 시 nowUrl 라인:
```typescript
      const nowUrl = nowUrls?.[i] ?? stillUrl; // real Commons photo if found, else placeholder
```
(기존 `nowUrl: stillUrl`를 위 변수 사용으로 교체. 나머지 로직·유니크 id·parseFilms 검증 동일.)

- [ ] **Step 4: run.ts 배선**

`scripts/ingest/run.ts`:
- import 추가: `import { makeCommonsFetcher } from "./commons";`
- fetcher 생성: `const commons = makeCommonsFetcher();`
- tags 루프 다음에 now 사진 조회(실패 내성):
```typescript
  const nowUrls: (string | null)[] = [];
  for (const loc of locations) {
    try { nowUrls.push(await commons.now(loc)); }
    catch (e) { console.warn(`[ingest] now-photo failed for "${loc.name}": ${e}`); nowUrls.push(null); }
  }
  const film = assembleFilm(meta, locations, tags, nowUrls);
```
- placeholder 경고를 실제 기준으로 갱신: `const placeholderNow = film.scenes.filter((s) => s.nowUrl === s.stillUrl).length;` (Commons 사진이 채워진 scene은 stillUrl과 다르므로 정확히 카운트됨 — Task 6 리뷰의 dead-branch도 이로써 해소.)

- [ ] **Step 5: 테스트 통과 + 빌드 확인**

Run: `npm test` (전체 통과) → `npm run build` (green).

- [ ] **Step 6: 커밋**

```bash
git add scripts/ingest/assemble.ts scripts/ingest/run.ts scripts/ingest/__tests__/assemble.test.ts
git commit -m "feat: inject Wikimedia now-photos into assembled scenes"
```

---

## Out of Scope
- vantage(카메라 정밀 위치/각도) 자동 정밀화 — LLM bearing은 근사치.
- 배치 ingest(여러 영화 동시) — 현재는 한 번에 한 영화. 필요 시 run.ts에 `--list` 추가.
- Commons 사진의 "정확히 그 프레임/각도" 매칭 — geosearch는 근접 사진일 뿐, 정밀 매칭은 사람 검수(HITL).
