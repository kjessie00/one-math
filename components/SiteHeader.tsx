import Link from "next/link";

import { STRAND_BY_ID, allUnits, unitLocation } from "@/content/index.ts";

import GlobalSearch, { type SearchEntry } from "./GlobalSearch";

const entries: SearchEntry[] = allUnits.map((unit) => {
  const location = unitLocation(unit);
  const strand = STRAND_BY_ID[unit.strand].name;
  return {
    id: unit.id,
    title: unit.title,
    location,
    strand,
    hay: [unit.title, unit.keywords.join(" "), location, strand].join(" ").toLowerCase(),
  };
});

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link className="wordmark" href="/">
          <span className="wordmark__mark" aria-hidden="true">
            一
          </span>
          한 수학 지도
        </Link>

        <nav className="site-nav" aria-label="주요 메뉴">
          <Link href="/">전체 지도</Link>
          <Link href="/guide">사용법과 근거</Link>
        </nav>

        <GlobalSearch entries={entries} />
      </div>
    </header>
  );
}
