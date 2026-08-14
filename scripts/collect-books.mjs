/**
 * 교재 주소 표(TSV) → 목차 수집 → catalog.json 까지 한 번에.
 *
 * 교재가 늘어도 손으로 쓰는 표를 늘리지 않으려고 만들었다.
 * 시리즈 메타(역할·구성·특징)는 별도 TSV로 받고, 목차는 여기서 직접 긁는다.
 *
 * 실행:
 *   node scripts/collect-books.mjs <volumes.tsv> <series.tsv> <출력 catalog.json> [<이미 긁은 jsonl>]
 *
 * volumes.tsv (탭 구분, 첫 줄은 머리글):
 *   시리즈키  학년-학기  판  주소
 * series.tsv:
 *   시리즈키  교재명  출판사  급(초등/중등/고등)  역할  구성  출판사가 밝힌 특징
 *
 * 목차를 못 가져온 권은 조용히 빠지고 마지막에 목록으로 알려 준다.
 * 출처 없는 목차는 절대 만들지 않는다.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";

const [volumesPath, seriesPath, outPath, cachePath] = process.argv.slice(2);
if (!volumesPath || !seriesPath || !outPath) {
  console.error(
    "쓰는 법: node scripts/collect-books.mjs <volumes.tsv> <series.tsv> <catalog.json> [cache.jsonl]",
  );
  process.exit(1);
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

function rows(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("\t").map((cell) => cell.trim()))
    .slice(1);
}

function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sliceToc(text) {
  const i = text.search(/^\s*목\s*차\s*$/m);
  if (i < 0) return null;
  const rest = text.slice(i + 1);
  let end = rest.length;
  for (const stop of [/\n\s*펼쳐보기/, /\n(책소개|출판사 서평|저자 소개|회원 리뷰|상품정보)/]) {
    const j = rest.search(stop);
    if (j > 40 && j < end) end = j;
  }
  const body = rest
    .slice(0, Math.min(end, 8000))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  return body.length > 40 ? body : null;
}

// 이미 긁은 것은 다시 부르지 않는다. 서점에도 우리에게도 좋다.
const cache = new Map();
if (cachePath && existsSync(cachePath)) {
  for (const line of readFileSync(cachePath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row.toc) cache.set(row.url, row.toc);
    } catch {}
  }
}

const seriesMeta = new Map();
for (const [key, name, publisher, level, role, structure, note] of rows(seriesPath)) {
  seriesMeta.set(key, {
    id: key,
    name,
    publisher,
    level,
    role,
    structure,
    ...(note ? { publisherNote: note } : {}),
  });
}

const wanted = rows(volumesPath).filter(([, , , url]) => /^https?:\/\//.test(url));
const missing = [];
const grouped = new Map();
let fetched = 0;

for (const [key, gradeTerm, edition, url] of wanted) {
  if (!seriesMeta.has(key)) {
    missing.push(`${key} ${gradeTerm}: 시리즈 메타 없음`);
    continue;
  }
  const [grade, term] = gradeTerm.split("-");
  let toc = cache.get(url);
  if (!toc) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": UA, "accept-language": "ko-KR,ko;q=0.9" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toc = sliceToc(toText(await res.text()));
      fetched += 1;
      if (toc && cachePath) appendFileSync(cachePath, `${JSON.stringify({ url, toc })}\n`);
      await new Promise((r) => setTimeout(r, 900));
    } catch (error) {
      missing.push(`${key} ${gradeTerm}: ${error.message}`);
      continue;
    }
  }
  if (!toc) {
    missing.push(`${key} ${gradeTerm}: 목차 없음`);
    continue;
  }
  const list = grouped.get(key) ?? [];
  list.push({ grade, term, edition, source: url, checked: new Date().toISOString().slice(0, 10) });
  grouped.set(key, list);
}

const catalog = {
  books: [...grouped.entries()].map(([key, volumes]) => ({ book: seriesMeta.get(key), volumes })),
};
writeFileSync(outPath, `${JSON.stringify(catalog, null, 1)}\n`, "utf8");

console.log(`새로 긁은 권: ${fetched} · 캐시에서 쓴 권: ${wanted.length - fetched - missing.length}`);
console.log(`교재 ${catalog.books.length}종 · ${[...grouped.values()].flat().length}권`);
if (missing.length) {
  console.log(`\n빠진 것 ${missing.length}건`);
  for (const line of missing) console.log(`  · ${line}`);
}
