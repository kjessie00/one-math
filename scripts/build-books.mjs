/**
 * 긁어 온 목차(JSONL)를 content/books.ts 로 옮긴다.
 *
 * 잇는 규칙은 하나다: **교재의 장 제목과 우리 단원 제목이 맞아떨어질 때만 잇는다.**
 * 억지로 맞추지 않는다. 맞는 단원이 없으면 unitId: null 로 두고
 * 화면에서 "이 교재에만 있는 장"으로 보이게 한다.
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
    .replace(/^[IVXⅠⅡⅢⅣⅤ]+\s*[.．]\s*/i, "")
    .replace(/^\d+\s*[.．]?\s*/, "")
    .replace(/\s*\d+\s*$/, "")
    .replace(/[()（）⑴⑵⑶⑷【】\[\]]/g, "")
    .replace(/[·ㆍ・]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/** 한 학기 단원 중 장 제목과 맞는 것을 고른다. 확실할 때만 돌려준다. */
function matchUnit(chapterTitle, units) {
  const c = norm(chapterTitle);
  if (!c) return null;
  // 1) 완전히 같은 이름
  const exact = units.find((u) => norm(u.title) === c);
  if (exact) return exact.id;
  // 2) 단원 이름이 장 제목에 통째로 들어 있다 (예: "01 소인수분해" ⊃ "소인수분해")
  const contains = units.filter((u) => c.includes(norm(u.title)) && norm(u.title).length >= 3);
  if (contains.length === 1) return contains[0].id;
  // 3) 장 제목이 단원 이름에 통째로 들어 있다
  const inside = units.filter((u) => norm(u.title).includes(c) && c.length >= 3);
  if (inside.length === 1) return inside[0].id;
  return null;
}

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
    let part = null;
    const chapters = [];
    const used = new Set();
    for (const raw of row.toc.split("\n")) {
      const line = raw.trim();
      if (!line || line === "목차") continue;
      // 대단원: 로마숫자로 시작하고 뒤에 번호가 없는 줄
      if (/^[IVXⅠⅡⅢⅣⅤ]+\s*[.．]/i.test(line)) {
        part = line;
        continue;
      }
      // 장 제목으로 먼저 견주고, 안 맞으면 대단원 이름으로 견준다.
      // 고1처럼 우리 단원이 대단원 크기일 때는 교재의 중단원 이름이 맞지 않는다.
      const unitId = matchUnit(line, units) ?? (part ? matchUnit(part, units) : null);
      // 한 단원에 두 장이 붙지 않게 처음 하나만 잇는다
      const finalId = unitId && !used.has(unitId) ? unitId : null;
      if (finalId) used.add(finalId);
      chapters.push({ part, title: line, unitId: finalId });
    }
    if (chapters.length === 0) {
      report.push(`건너뜀 ${entry.book.id} ${vol.grade}-${vol.term}: 장을 못 읽음`);
      continue;
    }
    volumes.push({ ...vol, bookId: entry.book.id, chapters });
    report.push(
      `${entry.book.id} ${vol.grade}-${vol.term}: 장 ${chapters.length}개 중 ${used.size}개 연결`,
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
