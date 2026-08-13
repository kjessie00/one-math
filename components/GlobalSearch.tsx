"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchEntry = {
  id: string;
  title: string;
  location: string;
  strand: string;
  hay: string;
};

/**
 * 전 학년 검색.
 * 학년을 먼저 고르지 않아도 "약분", "기울기"처럼 개념 이름만으로 바로 찾게 한다.
 */
export default function GlobalSearch({ entries }: { entries: SearchEntry[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (keyword.length < 1) return [];
    const hits = entries.filter((entry) => entry.hay.includes(keyword));
    hits.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(keyword) ? 0 : 1;
      const bTitle = b.title.toLowerCase().includes(keyword) ? 0 : 1;
      return aTitle - bTitle;
    });
    return hits.slice(0, 12);
  }, [entries, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const showPanel = open && query.trim().length > 0;

  return (
    <div className="search" ref={boxRef}>
      <div className="search__field">
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" fill="none">
          <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          role="combobox"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="단원·개념 검색"
          aria-label="전 학년 단원과 개념 검색"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>

      {showPanel ? (
        <ul className="search__results" id={listId}>
          {results.length === 0 ? (
            <li className="search__empty">찾는 단원이 없습니다. 단원 이름이나 개념어로 다시 검색해 보세요.</li>
          ) : (
            results.map((entry) => (
              <li key={entry.id}>
                <Link href={`/unit/${entry.id}`} onClick={() => setOpen(false)}>
                  <b>{entry.title}</b>
                  <span className="search__meta">
                    {entry.location} · {entry.strand}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
