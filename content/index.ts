/**
 * 콘텐츠 단일 원천의 조립부.
 *
 * 화면·테스트·PDF는 모두 이 파일이 만든 값만 쓴다.
 * 특히 "연결"은 단원 안의 prereq(단원 ID 목록)에서 자동으로 계산한다.
 * 사람이 양방향으로 손으로 적지 않으므로 앞뒤가 어긋날 수 없다.
 */
import {
  GRADE_ORDER,
  STRANDS,
  STRAND_BY_ID,
  TERM_LABEL,
  type Grade,
  type GradeId,
  type Strand,
  type StrandId,
  type TermId,
  type Unit,
  type UnitId,
} from "./schema.ts";

import { BOOKS, BOOK_VOLUMES, type Book, type BookChapter, type BookVolume } from "./books.ts";

import e1 from "./grades/e1.ts";
import e2 from "./grades/e2.ts";
import e3 from "./grades/e3.ts";
import e4 from "./grades/e4.ts";
import e5 from "./grades/e5.ts";
import e6 from "./grades/e6.ts";
import m1 from "./grades/m1.ts";
import m2 from "./grades/m2.ts";
import m3 from "./grades/m3.ts";
import h1 from "./grades/h1.ts";

export * from "./schema.ts";
export * from "./books.ts";
export { STRANDS, STRAND_BY_ID, TERM_LABEL, GRADE_ORDER };

export const grades: Grade[] = [e1, e2, e3, e4, e5, e6, m1, m2, m3, h1];

export const gradeById = new Map<GradeId, Grade>(
  grades.map((grade) => [grade.id, grade]),
);

const TERM_ORDER: TermId[] = ["s1", "s2"];

/** 초1-1학기부터 고1-2학기까지, 배우는 순서 그대로 늘어놓은 전체 단원 */
export const allUnits: Unit[] = grades.flatMap((grade) =>
  TERM_ORDER.flatMap((term) =>
    grade.units
      .filter((unit) => unit.term === term)
      .slice()
      .sort((a, b) => a.seq - b.seq),
  ),
);

export const unitById = new Map<UnitId, Unit>(
  allUnits.map((unit) => [unit.id, unit]),
);

/** 단원이 전체 순서에서 몇 번째인지. "앞/뒤" 판단에 쓴다. */
const unitIndex = new Map<UnitId, number>(
  allUnits.map((unit, index) => [unit.id, index]),
);

export function unitOrder(id: UnitId): number {
  return unitIndex.get(id) ?? -1;
}

/** prereq의 역방향. "이 단원을 알면 다음에 무엇이 열리는가" */
const forwardEdges = new Map<UnitId, UnitId[]>();
for (const unit of allUnits) {
  for (const link of unit.prereq) {
    const list = forwardEdges.get(link.id);
    if (list) list.push(unit.id);
    else forwardEdges.set(link.id, [unit.id]);
  }
}

export function prerequisitesOf(id: UnitId): Unit[] {
  const unit = unitById.get(id);
  if (!unit) return [];
  return unit.prereq
    .map((link) => unitById.get(link.id))
    .filter((value): value is Unit => Boolean(value))
    .sort((a, b) => unitOrder(a.id) - unitOrder(b.id));
}

export function leadsToOf(id: UnitId): Unit[] {
  return (forwardEdges.get(id) ?? [])
    .map((unitId) => unitById.get(unitId))
    .filter((value): value is Unit => Boolean(value))
    .sort((a, b) => unitOrder(a.id) - unitOrder(b.id));
}

/**
 * 막힌 단원에서 거슬러 올라가는 복구 경로.
 * 가까운 선수개념부터 단계별로 묶어 돌려주므로,
 * "한 칸만 내려갈지, 더 내려갈지"를 화면에서 그대로 보여 줄 수 있다.
 */
export function traceBack(id: UnitId, maxDepth = 3): Unit[][] {
  const seen = new Set<UnitId>([id]);
  const levels: Unit[][] = [];
  let frontier: UnitId[] = [id];

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const next: Unit[] = [];
    for (const current of frontier) {
      for (const prereq of prerequisitesOf(current)) {
        if (seen.has(prereq.id)) continue;
        seen.add(prereq.id);
        next.push(prereq);
      }
    }
    if (next.length === 0) break;
    next.sort((a, b) => unitOrder(b.id) - unitOrder(a.id));
    levels.push(next);
    frontier = next.map((unit) => unit.id);
  }

  return levels;
}

/** 학년 안에서 한 영역이 차지하는 칸. 전체 지도의 기본 단위다. */
export type MapCell = {
  grade: Grade;
  strand: Strand;
  units: Unit[];
};

export const mapGrid: MapCell[][] = STRANDS.map((strand) =>
  grades.map((grade) => ({
    grade,
    strand,
    units: grade.units
      .filter((unit) => unit.strand === strand.id)
      .slice()
      .sort((a, b) => unitOrder(a.id) - unitOrder(b.id)),
  })),
);

export function unitsOfStrand(strandId: StrandId): Unit[] {
  return allUnits.filter((unit) => unit.strand === strandId);
}

export function unitsOfTerm(gradeId: GradeId, term: TermId): Unit[] {
  const grade = gradeById.get(gradeId);
  if (!grade) return [];
  return grade.units
    .filter((unit) => unit.term === term)
    .slice()
    .sort((a, b) => a.seq - b.seq);
}

export function gradeOf(unit: Unit): Grade {
  const grade = gradeById.get(unit.grade);
  if (!grade) throw new Error(`알 수 없는 학년: ${unit.grade}`);
  return grade;
}

/** 화면에 쓰는 짧은 위치 표기. 예: "초3 · 2학기" / "고1 · 공통수학2" */
export function unitLocation(unit: Unit): string {
  const grade = gradeOf(unit);
  const book = grade.terms[unit.term].book;
  return `${grade.label} · ${book ?? TERM_LABEL[unit.term]}`;
}

const searchIndex = allUnits.map((unit) => ({
  unit,
  haystack: [
    unit.title,
    unit.goal,
    unit.risk,
    unit.teach,
    unit.sameText ?? "",
    unit.priorText ?? "",
    unit.keywords.join(" "),
    gradeOf(unit).label,
    STRAND_BY_ID[unit.strand].name,
  ]
    .join(" ")
    .toLowerCase(),
}));

/** 전 학년 검색. 제목이 맞은 단원을 위로 올린다. */
export function searchUnits(query: string, limit = 40): Unit[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [];
  const hits = searchIndex.filter((entry) => entry.haystack.includes(keyword));
  hits.sort((a, b) => {
    const aTitle = a.unit.title.toLowerCase().includes(keyword) ? 0 : 1;
    const bTitle = b.unit.title.toLowerCase().includes(keyword) ? 0 : 1;
    if (aTitle !== bTitle) return aTitle - bTitle;
    return unitOrder(a.unit.id) - unitOrder(b.unit.id);
  });
  return hits.slice(0, limit).map((entry) => entry.unit);
}

/* ── 시중 교재 연결 ──────────────────────────────────────────────────────
   막힌 단원을 찾은 다음 "그럼 어느 교재 몇 단원을 펴야 하나"까지 이어 준다. */

export const bookById = new Map<string, Book>(BOOKS.map((book) => [book.id, book]));

/** 한 단원을 다루는 교재들. 단원 화면에서 그대로 보여 준다. */
export type BookHit = {
  book: Book;
  volume: BookVolume;
  chapter: BookChapter;
};

const hitsByUnit = new Map<UnitId, BookHit[]>();
for (const volume of BOOK_VOLUMES) {
  const book = bookById.get(volume.bookId);
  if (!book) continue;
  for (const chapter of volume.chapters) {
    if (!chapter.unitId) continue;
    const list = hitsByUnit.get(chapter.unitId);
    const hit: BookHit = { book, volume, chapter };
    if (list) list.push(hit);
    else hitsByUnit.set(chapter.unitId, [hit]);
  }
}

const ROLE_ORDER: Record<Book["role"], number> = { 개념: 0, 유형: 1, 내신: 2, 심화: 3 };

export function booksForUnit(id: UnitId): BookHit[] {
  return (hitsByUnit.get(id) ?? [])
    .slice()
    .sort((a, b) => ROLE_ORDER[a.book.role] - ROLE_ORDER[b.book.role]);
}

/** 한 교재가 다루는 학기 목록. 교재 화면에서 쓴다. */
export function volumesOfBook(bookId: string): BookVolume[] {
  return BOOK_VOLUMES.filter((volume) => volume.bookId === bookId).sort(
    (a, b) =>
      GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade) || a.term.localeCompare(b.term),
  );
}

/** 교재 × 학기 격자. 어느 교재가 어느 학기를 덮는지 한눈에 보여 준다. */
export type BookCoverageCell = {
  grade: Grade;
  term: TermId;
  volume?: BookVolume;
  linked: number;
  total: number;
};

export const bookColumns: { grade: Grade; term: TermId }[] = grades.flatMap((grade) =>
  TERM_ORDER.map((term) => ({ grade, term })),
);

export function coverageOf(bookId: string): BookCoverageCell[] {
  const volumes = new Map(
    volumesOfBook(bookId).map((volume) => [`${volume.grade}-${volume.term}`, volume]),
  );
  return bookColumns.map(({ grade, term }) => {
    const volume = volumes.get(`${grade.id}-${term}`);
    return {
      grade,
      term,
      volume,
      linked: volume ? volume.chapters.filter((chapter) => chapter.unitId).length : 0,
      total: volume ? volume.chapters.length : 0,
    };
  });
}

export const bookStats = {
  bookCount: BOOKS.length,
  volumeCount: BOOK_VOLUMES.length,
  chapterCount: BOOK_VOLUMES.reduce((sum, volume) => sum + volume.chapters.length, 0),
  linkedChapterCount: BOOK_VOLUMES.reduce(
    (sum, volume) => sum + volume.chapters.filter((chapter) => chapter.unitId).length,
    0,
  ),
  /** 교재가 하나라도 붙은 단원 수 */
  coveredUnitCount: hitsByUnit.size,
};

export const stats = {
  gradeCount: grades.length,
  unitCount: allUnits.length,
  linkCount: allUnits.reduce((sum, unit) => sum + unit.prereq.length, 0),
  strandCount: STRANDS.length,
};
