/**
 * 긁어 온 목차(JSONL)를 content/books.ts 로 옮긴다.
 *
 * 잇는 규칙은 하나다: **교재의 장 제목과 우리 단원이 맞아떨어질 때만 잇는다.**
 * 억지로 맞추지 않는다. 맞는 단원이 없으면 unitId: null 로 두고
 * 화면에서 "이 교재에만 있는 장"으로 보이게 한다.
 *
 * 다만 학년마다 "단원"의 크기가 다르다.
 *  · 초·중등: 우리 단원 하나 ≈ 교재의 중단원 하나. 장 제목이 그대로 맞는다.
 *  · 고1: 우리 단원 하나 = 교재의 대단원 하나(예: '도형의 방정식' 안에 평면좌표·직선·원·이동).
 *    이때는 중단원 이름이 우리 단원과 맞을 리가 없다.
 * 그래서 세 단계로 내려간다. 장 제목 → 우리가 적어 둔 핵심어 → 대단원 이름.
 * 위 단계에서 붙은 장은 아래 단계를 보지 않는다.
 *
 * 실행: node scripts/build-books.mjs <verified.jsonl> <catalog.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [tocPath, catalogPath] = process.argv.slice(2);
if (!tocPath || !catalogPath) {
  console.error("쓰는 법: node scripts/build-books.mjs <verified.jsonl> <catalog.json>");
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, "..");
const { allUnits } = await import(path.join(ROOT, "content/index.ts"));
const TERMS = [...new Set(allUnits.map((u) => `${u.grade}-${u.term}`))];

/** catalog: 어느 URL이 어느 교재·학년·학기인지 사람이 정해 준 표 */
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const fetched = new Map();
for (const line of readFileSync(tocPath, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  if (row.toc) fetched.set(row.url, row);
}

/** 제목을 견주기 좋게 다듬는다. 번호·괄호·공백·중점만 걷어 낸다. */
function norm(text) {
  return text
    // 로마숫자 머리. 자이스토리처럼 점 없이 "Ⅱ 평면도형"으로 적는 목차도 있다.
    .replace(/^(?:[IVX]+\s*[.．]|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\s*[.．]?)\s*/i, "")
    .replace(/^\d+\s*[.．]?\s*/, "")
    .replace(/\s*\d+\s*$/, "")
    .replace(/[()（）⑴⑵⑶⑷【】\[\]]/g, "")
    .replace(/[·ㆍ・]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * 한 학기 단원 중 장 제목과 맞는 것을 고른다. 확실할 때만 돌려준다.
 * 얼마나 확실한지(0=같은 이름, 1=단원 이름을 품음, 2=단원 이름 안에 들어감)도 함께 준다.
 */
function matchUnit(chapterTitle, units, minLength = 3) {
  const c = norm(chapterTitle);
  if (!c) return null;
  // 1) 완전히 같은 이름
  const exact = units.find((u) => norm(u.title) === c);
  if (exact) return { id: exact.id, rank: 0 };
  // 2) 단원 이름이 장 제목에 통째로 들어 있다 (예: "01 소인수분해" ⊃ "소인수분해")
  const contains = units.filter((u) => c.includes(norm(u.title)) && norm(u.title).length >= 2);
  if (contains.length === 1) return { id: contains[0].id, rank: 1 };
  // 3) 장 제목이 단원 이름에 통째로 들어 있다 (예: "Ⅲ. 함수" ⊂ "함수와 그래프")
  const inside = units.filter((u) => norm(u.title).includes(c) && c.length >= minLength);
  if (inside.length === 1) return { id: inside[0].id, rank: 2 };
  return null;
}

/**
 * 장 제목이 우리가 그 단원에 적어 둔 핵심어를 통째로 품을 때 잇는다.
 * 핵심어는 우리가 직접 써 둔 그 단원의 범위다. 그래서 '유리함수의 그래프'라는 장은
 * '함수와 그래프' 단원 안이라고 말할 수 있다.
 * 짧은 핵심어(두 글자)는 우연히 겹치므로 받지 않고, 두 단원이 함께 걸리면 버린다.
 * (수학의 정석처럼 대단원 표시가 아예 없는 목차를 위한 수단이다.)
 */
function matchByKeyword(chapterTitle, units) {
  const c = norm(chapterTitle);
  if (c.length < 3) return null;
  const hit = units.filter((u) =>
    u.keywords.some((k) => norm(k).length >= 2 && c.includes(norm(k))),
  );
  return hit.length === 1 ? hit[0].id : null;
}

/**
 * 대단원 줄: 로마숫자로 시작한다.
 * 표기가 제각각이라 셋 다 받는다.
 *   "Ⅰ. 도형의 방정식"(정석·쎈) · "Ⅰ 기본 도형"(자이스토리) · "Ⅰ도형의 방정식"(수력충전)
 * 홑글자 로마자(I·V·X)는 영문 제목과 헷갈리므로 점이 있을 때만 받는다.
 */
const PART_LINE = /^(?:[IVX]+\s*[.．]|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\s*[.．]?)\s*(?=\S)/;

/** 단원에 이을 수 없는 줄. 부록·모의고사·정답은 어느 단원의 내용이 아니다. */
const NOT_A_CHAPTER = /(모의고사|정답|해설|찾아보기|부록|특별\s*부록|워크북)/;

const s = (v) => JSON.stringify(v);
const books = [];
const volumes = [];
const report = [];

for (const entry of catalog.books) {
  books.push(entry.book);
  for (const vol of entry.volumes) {
    const row = fetched.get(vol.source);
    if (!row) {
      report.push(`건너뜀 ${entry.book.id} ${vol.grade}-${vol.term}: 목차를 못 가져옴`);
      continue;
    }
    const units = allUnits.filter((u) => u.grade === vol.grade && u.term === vol.term);

    // 1단계: 줄을 읽어 대단원(part)과 장 제목을 뽑는다.
    // 같은 제목이 다시 나오면 버린다. 서점 목차는 뒤에 모의고사·정답 색인으로
    // 같은 목록을 한 번 더 싣는 일이 있고, 그것까지 세면 장 수가 부풀려진다.
    const lines = [];
    const seenTitle = new Set();
    let part = null;
    for (const raw of row.toc.split("\n")) {
      const line = raw.trim();
      if (!line || line === "목차") continue;
      if (PART_LINE.test(line)) {
        part = line;
        continue;
      }
      const key = norm(line);
      if (key && seenTitle.has(key)) continue;
      if (key) seenTitle.add(key);
      lines.push({ part, title: line });
    }

    // 1.5단계: 서점이 엉뚱한 목차를 실어 둔 권을 걸러 낸다.
    // 그 학기 단원과 하나도 맞지 않는데 다른 학기와는 맞는다면, 우리 표가 아니라
    // 상품 페이지가 틀린 것이다. (큐브 4-1 페이지에 3-1 목차가 실려 있었다.)
    // 단원 이름이 장 제목에 통째로 들어 있는 것(rank 0·1)만 센다.
    // 느슨한 쪽(rank 2)까지 세면 '도형의 이동'이 '평면도형의 이동'에 걸려 오판한다.
    const titleHits = (gradeTerm) => {
      const those = allUnits.filter((u) => `${u.grade}-${u.term}` === gradeTerm);
      return lines.filter((line) => (matchUnit(line.title, those)?.rank ?? 9) <= 1).length;
    };
    if (titleHits(`${vol.grade}-${vol.term}`) === 0) {
      const wrong = TERMS.filter((t) => t !== `${vol.grade}-${vol.term}` && titleHits(t) >= 3);
      if (wrong.length > 0) {
        report.push(
          `버림 ${entry.book.id} ${vol.grade}-${vol.term}: ` +
            `서점 목차가 ${wrong[0]} 것으로 보임 → ${vol.source}`,
        );
        continue;
      }
    }

    // 2단계: 대단원 이름을 미리 맞춰 둔다.
    // 한 단원을 여러 대단원이 함께 가리키면 가장 확실한 것만 남긴다.
    // (일품 공통수학2의 'Ⅱ. 방정식'처럼 목차 표기가 어긋난 경우를 막는다.)
    const partHit = new Map();
    for (const { part: p } of lines) {
      if (!p || partHit.has(p)) continue;
      partHit.set(p, matchUnit(p, units, 2));
    }
    const bestRank = new Map();
    for (const hit of partHit.values()) {
      if (!hit) continue;
      const prev = bestRank.get(hit.id);
      if (prev === undefined || hit.rank < prev) bestRank.set(hit.id, hit.rank);
    }
    for (const [p, hit] of partHit) {
      if (hit && hit.rank > bestRank.get(hit.id)) partHit.set(p, null);
    }

    // 3단계: 장 제목 → 핵심어 → 대단원 순으로 내려간다.
    // 장 제목으로 붙은 단원은 그 권에서 한 장만 갖는다(같은 자리를 두 번 세지 않는다).
    // 대단원으로 붙는 장은 여러 개여도 된다. 그 대단원이 통째로 그 단원이기 때문이다.
    const chapters = [];
    const used = new Set();
    const claimedByTitle = new Set();
    for (const line of lines) {
      let unitId = null;
      if (!NOT_A_CHAPTER.test(line.title)) {
        const byTitle = matchUnit(line.title, units);
        if (byTitle && !claimedByTitle.has(byTitle.id)) {
          claimedByTitle.add(byTitle.id);
          unitId = byTitle.id;
        } else if (!byTitle) {
          unitId = matchByKeyword(line.title, units) ?? partHit.get(line.part)?.id ?? null;
        }
      }
      if (unitId) used.add(unitId);
      chapters.push({ part: line.part, title: line.title, unitId });
    }
    if (chapters.length === 0) {
      report.push(`건너뜀 ${entry.book.id} ${vol.grade}-${vol.term}: 장을 못 읽음`);
      continue;
    }
    volumes.push({ ...vol, bookId: entry.book.id, chapters });
    report.push(
      `${entry.book.id} ${vol.grade}-${vol.term}: 장 ${chapters.length}개 중 ` +
        `${chapters.filter((c) => c.unitId).length}개 연결 · 단원 ${used.size}/${units.length}`,
    );
  }
}

const file = `${readFileSync(path.join(ROOT, "content/books.ts"), "utf8").split("export const BOOKS")[0]}export const BOOKS: Book[] = [
${books
  .map(
    (b) => `  {
    id: ${s(b.id)},
    name: ${s(b.name)},
    publisher: ${s(b.publisher)},
    level: ${s(b.level)},
    role: ${s(b.role)},
    structure: ${s(b.structure)},${b.publisherNote ? `\n    publisherNote: ${s(b.publisherNote)},` : ""}${b.fitFor ? `\n    fitFor: ${s(b.fitFor)},` : ""}
  },`,
  )
  .join("\n")}
];

export const BOOK_VOLUMES: BookVolume[] = [
${volumes
  .map(
    (v) => `  {
    bookId: ${s(v.bookId)},
    grade: ${s(v.grade)},
    term: ${s(v.term)},
    edition: ${s(v.edition)},
    source: ${s(v.source)},
    checked: ${s(v.checked)},
    chapters: [
${v.chapters
  .map(
    (c) =>
      `      { ${c.part ? `part: ${s(c.part)}, ` : ""}title: ${s(c.title)}, unitId: ${c.unitId ? s(c.unitId) : "null"} },`,
  )
  .join("\n")}
    ],
  },`,
  )
  .join("\n")}
];
`;

writeFileSync(path.join(ROOT, "content/books.ts"), file, "utf8");
console.log(report.join("\n"));
console.log(`\n교재 ${books.length}종 · ${volumes.length}권`);
