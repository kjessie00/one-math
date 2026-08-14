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

/**
 * 제목을 견주기 좋게 다듬는다.
 *
 * **다듬는 것은 자리를 가리키는 번호뿐이다.** 내용을 가리키는 숫자는 남긴다.
 * 이것을 잘못하면 서로 다른 것이 같아져서, 못 잇거나 엉뚱하게 잇는다.
 * 실제로 났던 일:
 *  · 앞 숫자를 다 지워 '9까지의 수'와 '50까지의 수'가 둘 다 '까지의수'가 됐다
 *  · 뒤 숫자를 다 지워 '덧셈과 뺄셈 1/2/3' 세 단원이 전부 '덧셈과뺄셈'이 됐다
 *  · ⑴⑵⑶을 지워 '덧셈과 뺄셈⑴'과 '⑵'가 같아져 뒤엣것이 중복으로 버려졌다
 * 그래서 원문자 번호는 지우지 않고 보통 숫자로 바꿔 **남긴다.**
 */
const CIRCLED = "⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽";
function norm(text) {
  return (
    text
      // 로마숫자 머리. 자이스토리처럼 점 없이 "Ⅱ 평면도형"으로 적는 목차도 있다.
      .replace(/^(?:[IVX]+\s*[.．]|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\s*[.．]?)\s*/i, "")
      // 장 번호. 숫자 뒤에 점이나 빈칸이 있을 때만 지운다.
      .replace(/^\d+\s*[.．]\s*|^\d+\s+/, "")
      // 쪽 번호. 쎈처럼 "01 평면좌표 8", "11 이차함수의 그래프 ⑴ 160"으로
      // 쪽수를 붙여 파는 목차가 있다. 두 자리 이상일 때만 지운다.
      // '덧셈과 뺄셈 1'의 1은 쪽수가 아니라 내용의 일부다.
      .replace(/\s+\d{2,}\s*$/, "")
      // ⑴ → 1. 지우지 않고 남겨야 ⑴과 ⑵가 구별된다.
      .replace(/[⑴-⑽]/g, (c) => String(CIRCLED.indexOf(c) + 1))
      .replace(/[()（）【】\[\]]/g, "")
      .replace(/[·ㆍ・]/g, "")
      .replace(/\s+/g, "")
      .trim()
  );
}

/**
 * 한 학기 단원 중 장 제목과 맞는 것을 고른다. 확실할 때만 돌려준다.
 * 얼마나 확실한지(0=같은 이름, 1=단원 이름을 품음, 2=단원 이름 안에 들어감)도 함께 준다.
 */
function matchUnit(chapterTitle, units, minLength = 2) {
  const c = norm(chapterTitle);
  if (!c) return null;
  // 1) 완전히 같은 이름
  const exact = units.find((u) => norm(u.title) === c);
  if (exact) return { id: exact.id, rank: 0 };
  // 2) 단원 이름이 장 제목에 통째로 들어 있다 (예: "01 소인수분해" ⊃ "소인수분해")
  const contains = units.filter((u) => c.includes(norm(u.title)) && norm(u.title).length >= 2);
  if (contains.length === 1) return { id: contains[0].id, rank: 1 };
  // 3) 장 제목이 단원 이름에 통째로 들어 있다 (예: "Ⅲ. 함수" ⊂ "함수와 그래프")
  // 두 글자짜리도 받는다. '5. 집합'·'06 명제'·'9. 함수'·'09 순열'·'10 조합'·'7 확률'은
  // 두 글자지만 그 학기에 걸리는 단원이 하나뿐이라 헷갈릴 여지가 없다.
  // 걸리는 단원이 둘 이상이면 아래에서 어차피 버려진다.
  const inside = units.filter((u) => norm(u.title).includes(c) && c.length >= minLength);
  if (inside.length === 1) return { id: inside[0].id, rank: 2 };
  return null;
}

/**
 * 장 제목이 우리가 그 단원에 적어 둔 핵심어를 통째로 품을 때 잇는다.
 * 핵심어는 우리가 직접 써 둔 그 단원의 범위다. 그래서 '유리함수의 그래프'라는 장은
 * '함수와 그래프' 단원 안이라고 말할 수 있다.
 *
 * 두 글자 핵심어도 받는다. '순열'·'조합'을 받아야 '09 순열과 조합' 장이 붙는다.
 *
 * 다만 **옆 단원이 그 장을 이름으로 주장하고 있으면 뺏지 않는다.**
 * 중3 '근호'(제곱근과 실수의 핵심어)가 '근호를 포함한 식의 곱셈과 나눗셈' 장에 걸렸는데,
 * 그 장은 옆 단원 '근호를 포함한 식의 계산'의 것이다. 핵심어는 이름보다 약한 근거라
 * 이름이 먼저다. 그래서 옆 단원 이름이 이 장과 겹치면 핵심어로 잇지 않는다.
 * (핵심어가 옆 단원 이름에 들어 있는지만 보면 너무 넓다. 중2 '일차함수'는 옆 단원
 *  '일차함수와 일차방정식의 관계'에 들어 있지만, 장 '일차함수와 그래프'를
 *  그 옆 단원이 주장하지는 않는다.)
 *
 * 두 단원이 함께 걸려도 버린다.
 */
function matchByKeyword(chapterTitle, units) {
  const c = norm(chapterTitle);
  if (c.length < 3) return null;
  // 이 장을 이름으로 주장하는 단원이 있으면, 그 단원 말고는 핵심어로 못 가져간다.
  const claimedByName = new Set(
    units.filter((u) => norm(u.title).length >= 3 && c.includes(norm(u.title))).map((u) => u.id),
  );
  const hit = units.filter(
    (u) =>
      (claimedByName.size === 0 || claimedByName.has(u.id)) &&
      u.keywords.some((k) => norm(k).length >= 2 && c.includes(norm(k))),
  );
  return hit.length === 1 ? hit[0].id : null;
}

/**
 * 조사 '의'를 뺀 모양. 마지막 수단으로만 쓴다.
 *
 * 우리 단원은 '평행선 사이 선분 길이의 비'인데 교재는 모두
 * '평행선 사이의 선분의 길이의 비'로 적는다. 같은 것을 가리키는 같은 말인데
 * 조사 하나 때문에 어느 쪽도 상대를 품지 못해, 다섯 권에서 이 단원이 사라졌다.
 */
function looseNorm(text) {
  return norm(text).replace(/의/g, "");
}

/** 한 글자만 다른가. 서점 목차의 오타를 견디기 위한 것이다. */
function offByOne(a, b) {
  if (a.length !== b.length || a.length < 5) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i] && (diff += 1) > 1) return false;
  return diff === 1;
}

/**
 * 위 두 가지를 마지막에 한 번 더 견준다. 이름·핵심어·대단원이 다 실패한 뒤에만 부른다.
 * 조사 차이('평행선 사이의 선분의 길이의 비')와 서점 오타('복수수'·'길이와 사긴'·
 * '도형의 닯음')를 여기서 건진다. 한 단원만 걸릴 때만 돌려준다.
 */
function matchLoosely(chapterTitle, units) {
  const c = looseNorm(chapterTitle);
  if (c.length < 5) return null;
  const hit = units.filter((u) => {
    const t = looseNorm(u.title);
    return t.length >= 5 && (c.includes(t) || t.includes(c) || offByOne(c, t));
  });
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

/**
 * 소단원 줄: ①②③으로 시작한다. 개념+유형처럼 장 아래를 다시 쪼개 싣는 목차가 있다.
 * 소단원은 **바로 위 장에 속한다.** 따로 이으면 안 된다.
 * '⑤ 10을 만들어 더하기'는 그 자체로는 '덧셈과 뺄셈 2'처럼 보이지만
 * 실제로는 '2. 덧셈과 뺄셈(1)' 장 안의 다섯째 꼭지다.
 */
const SUB_LINE = /^\s*[①-⑳]/;

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
    //
    // '★ 학교 시험 대비 단원별 모의고사' 같은 줄을 만나면 **거기서 끊는다.**
    // 그 뒤는 앞 목록을 한 번 더 실은 색인이라 장이 아니다.
    // 같은 제목 걸러 내기만으로는 모자란다. 서점이 두 줄을 한 줄로 붙여 싣는 일이 있어
    // ("B 삼각형의 외심과 내심 C 평행사변형") 문자열이 달라져 그대로 통과했고,
    // 마지막 대단원이 'Ⅴ 확률'이라 기하 장이 확률 단원에 붙어 화면에 나갔다.
    const lines = [];
    const seenTitle = new Set();
    let part = null;
    for (const raw of row.toc.split("\n")) {
      const line = raw.trim();
      if (!line || line === "목차") continue;
      if (NOT_A_CHAPTER.test(line)) break;
      if (PART_LINE.test(line)) {
        part = line;
        continue;
      }
      // 소단원은 바로 위 장에 딸려 둔다. 따로 잇지 않는다.
      if (SUB_LINE.test(line) && lines.length > 0) {
        lines[lines.length - 1].subs.push(line);
        continue;
      }
      const key = norm(line);
      if (key && seenTitle.has(key)) continue;
      if (key) seenTitle.add(key);
      lines.push({ part, title: line, subs: [] });
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
    //
    // 장 제목이 단원 **이름 그대로**일 때(rank 0·1)는 그 장 하나가 그 단원이다.
    // 그런 장이 여럿이면 이름이 가장 정확한 하나만 갖는다. 그래서 두 번 돈다.
    // 한 번에 돌면 앞에 나온 느슨한 장이 자리를 차지해, 뒤에 오는 이름이 똑같은
    // 장이 밀려난다. 고1 '이차방정식과 이차함수'가 앞의 '이차방정식' 장에 밀려
    // 9권에서 떨어져 있었다.
    //
    // 반대로 장 제목이 단원 이름 **안에 들어가는** 것(rank 2)은 그 장이 단원의
    // 일부라는 뜻이다. '09 순열'과 '10 조합'은 둘 다 '경우의 수와 순열·조합'이다.
    // 이때는 여럿이 함께 붙어도 된다. 대단원으로 붙는 것과 같은 이치다.
    const byTitle = lines.map((line) =>
      NOT_A_CHAPTER.test(line.title) ? null : matchUnit(line.title, units),
    );
    const winner = new Map(); // 단원 → 그 단원 이름을 통째로 가질 장의 자리
    byTitle.forEach((hit, i) => {
      if (!hit || hit.rank === 2) return;
      const prev = winner.get(hit.id);
      if (prev === undefined || hit.rank < byTitle[prev].rank) winner.set(hit.id, i);
    });

    const chapters = [];
    const used = new Set();
    lines.forEach((line, i) => {
      let unitId = null;
      if (!NOT_A_CHAPTER.test(line.title)) {
        // 이름으로 이길 자리이거나, 단원의 일부를 가리키는 장이면 그 단원을 갖는다.
        if (byTitle[i] && (byTitle[i].rank === 2 || winner.get(byTitle[i].id) === i)) {
          unitId = byTitle[i].id;
        } else {
          // 진 장도 그대로 버리지 않는다. 핵심어나 대단원이 다른 단원을 가리킬 수 있다.
          // (같은 단원을 다시 가리키면 그것도 맞는 말이므로 받는다.)
          // 다 실패하면 조사·오타를 견디는 마지막 견주기를 한 번 더 한다.
          unitId =
            matchByKeyword(line.title, units) ??
            partHit.get(line.part)?.id ??
            matchLoosely(line.title, units);
        }
      }
      if (unitId) used.add(unitId);
      chapters.push({ part: line.part, title: line.title, unitId });
    });
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
