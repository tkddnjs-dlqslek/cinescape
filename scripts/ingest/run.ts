import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { parseFilms, type Film } from "@/lib/types";
import { makeWikidataFetcher } from "./wikidata";
import { makeTmdbFetcher } from "./tmdb";
import { makeSceneTagger } from "./sceneTagger";
import { makeCommonsFetcher } from "./commons";
import { assembleFilm } from "./assemble";
import { mergeFilms } from "./merge";

// tsx does not auto-load .env like Next.js does. Load it manually (existing
// process.env vars win, so shell overrides still work).
function loadDotenv(): void {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function main() {
  loadDotenv();
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
  const commons = makeCommonsFetcher();

  console.log(`[ingest] tmdb=${tmdbId}: fetching locations + meta...`);
  const [locations, meta] = await Promise.all([wiki.locations(tmdbId), tmdb.meta(tmdbId)]);
  console.log(`[ingest] ${locations.length} locations, ${meta.stillUrls.length} stills for "${meta.title}"`);
  if (locations.length === 0) {
    console.error(`[ingest] no Wikidata filming locations for tmdb=${tmdbId} — skipping.`);
    process.exit(1);
  }

  const tags = [];
  for (const loc of locations) {
    try {
      tags.push(await tagger.tag(meta.title, loc));
    } catch (e) {
      console.warn(`[ingest] tag failed for "${loc.name}": ${e}`);
      tags.push({ name: loc.name, note: "", bearing: 0 });
    }
  }

  const nowUrls: (string | null)[] = [];
  for (const loc of locations) {
    try { nowUrls.push(await commons.now(loc)); }
    catch (e) { console.warn(`[ingest] now-photo failed for "${loc.name}": ${e}`); nowUrls.push(null); }
  }

  const film = assembleFilm(meta, locations, tags, nowUrls);
  const placeholderNow = film.scenes.filter((s) => s.nowUrl === s.stillUrl).length;

  if (meta.director === "Unknown" || meta.year === 0) {
    console.warn(`[ingest] ⚠ needsManualReview: director="${meta.director}" year=${meta.year} — check TMDB metadata for tmdb=${tmdbId}.`);
  }

  const dataPath = resolve(process.cwd(), "data/films.json");
  const existing: Film[] = parseFilms(JSON.parse(readFileSync(dataPath, "utf8")));
  const merged = mergeFilms(existing, film);
  parseFilms(merged); // final integrity gate
  const tmp = dataPath + ".tmp";
  writeFileSync(tmp, JSON.stringify(merged, null, 2) + "\n", "utf8");
  renameSync(tmp, dataPath);

  console.log(`[ingest] wrote "${film.title}" (${film.scenes.length} scenes) → data/films.json`);
  console.warn(`[ingest] ⚠ ${placeholderNow}/${film.scenes.length} scenes need a real "now" photo (nowUrl is placeholder).`);
}

main().catch((e) => {
  console.error("[ingest] failed:", e);
  process.exit(1);
});
