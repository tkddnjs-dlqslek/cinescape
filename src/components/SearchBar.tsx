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
            listStyle: "none", background: "var(--surface-deep)", border: "1px solid var(--line)",
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
