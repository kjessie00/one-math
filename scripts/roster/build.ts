/**
 * 학생 명부 도구 빌드
 *
 *   node --experimental-strip-types scripts/roster/build.ts
 *
 * 하는 일
 * 1. content/ 의 단원 110개를 **단원 카탈로그**로 뽑는다 (교육과정 정보만, 개인정보 없음).
 * 2. /roster-data/roster.json 을 읽는다. 없으면 인수인계 가져오기 파일로 처음 한 번 만든다.
 * 3. 카탈로그와 명부를 심어 /roster-data/roster.html 을 만든다.
 *
 * 학생 데이터는 /roster-data/ 밖으로 절대 나가지 않는다. 이 저장소는 정적 공개 배포다.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  allUnits,
  unitOrder,
  unitLocation,
  gradeById,
  STRAND_BY_ID,
  GRADE_ORDER,
} from "../../content/index.ts";
import type { UnitId } from "../../content/schema.ts";
import {
  EMPTY_ROSTER,
  SCHEMA_VERSION,
  validateRoster,
  type Roster,
  type Student,
  type Progress,
  type BookUse,
} from "./schema.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const DATA_DIR = join(ROOT, "roster-data");
const ROSTER_JSON = join(DATA_DIR, "roster.json");
const OUT_HTML = join(DATA_DIR, "roster.html");
const APP_TPL = join(HERE, "app.html");
/** 최초 1회 부트스트랩용. 2026-08-13 인수인계 HWP에서 뽑아 검증한 60명. */
const IMPORT_JSON = join(DATA_DIR, "handover-import.json");

/* ------------------------------------------------------------------ */
/* 1. 단원 카탈로그                                                     */
/* ------------------------------------------------------------------ */

export type CatalogUnit = {
  id: UnitId;
  grade: string;
  gradeLabel: string;
  term: string;
  seq: number;
  strand: string;
  strandName: string;
  title: string;
  goal: string;
  keywords: string[];
  prereq: { id: UnitId; why: string }[];
  risk: string;
  gate: { q: string; a: string; signal: string; fix: string };
  loc: string;
  order: number;
};

export function buildCatalog(): CatalogUnit[] {
  return allUnits.map((u) => ({
    id: u.id,
    grade: u.grade,
    gradeLabel: gradeById.get(u.grade)!.label,
    term: u.term,
    seq: u.seq,
    strand: u.strand,
    strandName: STRAND_BY_ID[u.strand].name,
    title: u.title,
    goal: u.goal,
    keywords: u.keywords,
    prereq: u.prereq.map((p) => ({ id: p.id, why: p.why })),
    risk: u.risk,
    gate: {
      q: u.gate.question,
      a: u.gate.answer,
      signal: u.gate.signal,
      fix: u.gate.fix,
    },
    loc: unitLocation(u),
    order: unitOrder(u.id),
  }));
}

/* ------------------------------------------------------------------ */
/* 2. 교재 문자열 → 단원 ID 추정                                        */
/* ------------------------------------------------------------------ */

const norm = (s: string) => s.replace(/[\s·’'"()[\]]/g, "");

/** 두 글자씩 끊어 비교한다. "원의 넓이와 둘레"와 "원의 둘레와 넓이"처럼 어순이 달라도 잡힌다. */
function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const ga = grams(a);
  const gb = grams(b);
  let hit = 0;
  for (const [g, n] of ga) hit += Math.min(n, gb.get(g) ?? 0);
  return (2 * hit) / (a.length - 1 + b.length - 1);
}

/**
 * 교재 문자열에서 학년·학기를 읽는다.
 *
 * `schoolOf`는 **학생의 학년**이다. "베이직쎈3-2"의 `3-2`는 초등 학생이면 초3 2학기지만
 * 중등 학생이면 중3 2학기다. 학생 맥락 없이 읽으면 조용히 엉뚱한 단원에 붙는다.
 */
function readGradeTerm(
  text: string,
  studentGrade?: string,
): { grade?: string; term?: string } {
  const t = text.replace(/\s/g, "");
  let m = /중등수학([1-3])-([12])/.exec(t) ?? /중([1-3])-([12])/.exec(t);
  if (m) return { grade: `m${m[1]}`, term: `s${m[2]}` };
  if (/공통수학2/.test(t)) return { grade: "h1", term: "s2" };
  if (/공통수학1/.test(t)) return { grade: "h1", term: "s1" };
  m = /중([1-3])[AB]/.exec(t);
  if (m) return { grade: `m${m[1]}` };

  m = /(?:^|[^0-9])([1-6])-([12])(?:[^0-9]|$)/.exec(t);
  if (m) {
    const n = m[1];
    const term = `s${m[2]}`;
    const school = studentGrade?.[0];
    if (school === "h") return { grade: "h1", term };
    if (school === "m") return n <= "3" ? { grade: `m${n}`, term } : { term };
    return { grade: `e${n}`, term };
  }
  return {};
}

/**
 * 교재 문자열에서 단원을 추정한다. 확실하지 않으면 null을 준다.
 * 결과에는 `inferred: true`가 붙어 화면에서 사람이 확인·수정하게 된다.
 * 애매한 것을 억지로 붙이는 것보다 비워 두는 편이 낫다.
 */
export function inferUnit(
  text: string,
  catalog: CatalogUnit[],
  studentGrade?: string,
): { unitId: UnitId; score: number } | null {
  const paren = /[(（]([^)）]+)[)）]/.exec(text);
  // 괄호가 있으면 그 안이 단원명이고, 없으면 교재명 뒤에 붙은 말이 단원명이다.
  const raw = paren ? paren[1] : text.replace(/^[가-힣A-Za-z]+[0-9A-Z]*-?[0-9]?\s*/, "");
  const topic = norm(raw);
  if (topic.length < 2) return null;

  const { grade, term } = readGradeTerm(text, studentGrade);

  let best: { unitId: UnitId; score: number } | null = null;
  for (const u of catalog) {
    if (grade && u.grade !== grade) continue;
    if (term && u.term !== term) continue;
    // 학년 단서가 전혀 없으면 학생과 같은 학교급으로만 좁힌다.
    if (!grade && studentGrade && u.grade[0] !== studentGrade[0]) continue;

    const title = norm(u.title);
    let score = 0;
    if (title === topic) score = 100;
    else score = Math.round(dice(title, topic) * 88);

    for (const k of u.keywords) {
      const kk = norm(k);
      if (kk.length < 2) continue;
      if (kk === topic) score = Math.max(score, 95);
      else score = Math.max(score, Math.round(dice(kk, topic) * 84));
    }
    // 교재명에 학년 표기가 없으면("만점왕 6단계") 학생이 지금 있는 학년을 먼저 본다.
    if (!grade && studentGrade && u.grade === studentGrade) score += 4;
    if (score > (best?.score ?? 0)) best = { unitId: u.id, score };
  }
  return best && best.score >= 62 ? best : null;
}

/** 사람이 고를 수 있게 상위 후보를 준다. 자동 매칭이 실패한 교재에 화면에서 붙인다. */
export function suggestUnits(
  text: string,
  catalog: CatalogUnit[],
  studentGrade?: string,
  limit = 5,
): { unitId: UnitId; score: number }[] {
  const paren = /[(（]([^)）]+)[)）]/.exec(text);
  const raw = paren ? paren[1] : text.replace(/^[가-힣A-Za-z]+[0-9A-Z]*-?[0-9]?\s*/, "");
  const topic = norm(raw) || norm(text);
  const { grade, term } = readGradeTerm(text, studentGrade);
  return catalog
    .map((u) => {
      let score = Math.round(dice(norm(u.title), topic) * 88);
      for (const k of u.keywords) {
        score = Math.max(score, Math.round(dice(norm(k), topic) * 84));
      }
      if (grade && u.grade === grade) score += 12;
      if (term && u.term === term) score += 6;
      if (studentGrade && u.grade === studentGrade) score += 4;
      return { unitId: u.id, score };
    })
    .filter((x) => x.score > 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* 3. 인수인계 60명 → 명부 스키마                                        */
/* ------------------------------------------------------------------ */

type ImportRow = {
  id: string;
  g: string;
  n: string;
  s: string;
  b: string[];
  t: string[];
  k: string[];
  st?: string;
};

const GRADE_CODE: Record<string, string> = {
  초1: "e1", 초2: "e2", 초3: "e3", 초4: "e4", 초5: "e5", 초6: "e6",
  중1: "m1", 중2: "m2", 중3: "m3", 고1: "h1",
};

/** 수학 교재 없이 자습서·평가문제집만 있는 학생은 국어로 본다(인수인계 확인 대기 항목). */
function guessSubjects(row: ImportRow): ("수학" | "국어")[] {
  const korean = row.k.includes("국어 수업");
  const hasMath = row.b.some((b) => !/자습서|평가문제집|문제집 \(/.test(b));
  const out: ("수학" | "국어")[] = [];
  if (hasMath) out.push("수학");
  if (korean || !hasMath) out.push("국어");
  return out.length ? out : ["수학"];
}

export function migrate(rows: ImportRow[], catalog: CatalogUnit[]): Roster {
  const at = "2026-08-13";
  const students: Student[] = [];
  const progress: Progress[] = [];
  const books: BookUse[] = [];
  let pn = 0;
  let bn = 0;

  for (const row of rows) {
    const id = row.id;
    students.push({
      id,
      name: row.n,
      grade: GRADE_CODE[row.g] ?? row.g,
      school: row.s ?? "",
      subjects: guessSubjects(row),
      status: (row.st as Student["status"]) ?? "재원",
      tags: row.k ?? [],
      notes: row.t ?? [],
      origin: { at, source: "TalkFile_인수인계.hwp" },
    });

    const seen = new Set<string>();
    for (const title of row.b) {
      books.push({
        id: `b${String(++bn).padStart(4, "0")}`,
        studentId: id,
        title,
        status: "사용중",
        role: /연산|교과셈|바빠|빅터|쎈연산|빨강연산/.test(title)
          ? "연산"
          : "본교재",
      });
      const hit = inferUnit(title, catalog, GRADE_CODE[row.g] ?? row.g);
      if (hit && !seen.has(hit.unitId)) {
        seen.add(hit.unitId);
        progress.push({
          id: `p${String(++pn).padStart(4, "0")}`,
          studentId: id,
          unitId: hit.unitId,
          state: "진행",
          startedAt: at,
          inferred: true,
          note: `인수인계 교재 문구에서 자동 추정: ${title}`,
        });
      }
    }
  }

  return {
    ...EMPTY_ROSTER,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: at,
    students,
    progress,
    books,
  };
}

/* ------------------------------------------------------------------ */
/* 4. 빌드                                                             */
/* ------------------------------------------------------------------ */

function loadRoster(catalog: CatalogUnit[]): Roster {
  if (existsSync(ROSTER_JSON)) {
    return JSON.parse(readFileSync(ROSTER_JSON, "utf8")) as Roster;
  }
  if (existsSync(IMPORT_JSON)) {
    const rows = JSON.parse(readFileSync(IMPORT_JSON, "utf8")) as ImportRow[];
    const roster = migrate(rows, catalog);
    writeFileSync(ROSTER_JSON, JSON.stringify(roster, null, 1), "utf8");
    console.log(
      `[roster] 인수인계 ${rows.length}명을 명부로 옮겼습니다 → ${ROSTER_JSON}`,
    );
    return roster;
  }
  console.log("[roster] 기존 명부가 없어 빈 명부로 시작합니다.");
  return { ...EMPTY_ROSTER, updatedAt: new Date().toISOString().slice(0, 10) };
}

function main() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  const catalog = buildCatalog();
  const roster = loadRoster(catalog);

  const known = new Set(catalog.map((u) => u.id));
  const issues = validateRoster(roster, known);
  const errors = issues.filter((i) => i.level === "error");
  for (const i of issues) {
    console.log(`  ${i.level === "error" ? "✗" : "!"} ${i.where} — ${i.message}`);
  }
  if (errors.length) {
    console.error(`[roster] 오류 ${errors.length}건. 빌드를 멈춥니다.`);
    process.exit(1);
  }

  const tpl = readFileSync(APP_TPL, "utf8");
  const enc = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");
  const html = tpl
    .replace("__CATALOG__", enc(catalog))
    .replace("__GRADES__", enc(GRADE_ORDER))
    .replace("__DATA__", enc(roster));
  writeFileSync(OUT_HTML, html, "utf8");

  const inferred = roster.progress.filter((p) => p.inferred).length;
  console.log(
    `[roster] 단원 ${catalog.length}개 · 학생 ${roster.students.length}명 ` +
      `· 진도 ${roster.progress.length}건(추정 ${inferred}) → ${OUT_HTML}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
