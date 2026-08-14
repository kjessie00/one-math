/**
 * 교재 목차 수집기
 *
 * 온라인 서점의 상품 페이지에서 **목차와 출판사 소개**를 그대로 긁어 온다.
 * 교보문고는 봇 차단으로 본문이 오지 않아 쓰지 않는다. 예스24가 서버 렌더라 잘 열린다.
 *
 * 쓰는 법
 *   node scripts/fetch-book-toc.mjs <상품URL> [<상품URL> ...]
 *   node scripts/fetch-book-toc.mjs --file urls.txt
 *
 * 결과는 JSON 한 줄씩 stdout으로 나온다. 실패해도 그 줄만 error로 표시하고 계속한다.
 * 사람이 읽고 검증한 뒤에만 content/books.ts 로 옮긴다. 이 스크립트가 콘텐츠를 직접 쓰지 않는다.
 */
import { readFileSync } from "node:fs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

/** 태그를 걷어 내고 사람이 읽는 줄만 남긴다. */
function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** id나 class 이름에 기대지 않고, 표식 문구 사이의 덩어리를 잘라 낸다. */
function sliceBetween(text, startPatterns, endPatterns, max = 6000) {
  for (const start of startPatterns) {
    const i = text.search(start);
    if (i < 0) continue;
    const rest = text.slice(i + 1);
    let end = rest.length;
    for (const stop of endPatterns) {
      const j = rest.search(stop);
      if (j > 40 && j < end) end = j;
    }
    const body = rest
      .slice(0, Math.min(end, max))
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    if (body.length > 40) return body;
  }
  return null;
}

async function fetchOne(url) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, "accept-language": "ko-KR,ko;q=0.9" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = toText(await res.text());

  const title =
    text.match(/^(.{5,90}?)\s*[-|]\s*(예스24|YES24|알라딘|인터파크)/m)?.[1]?.trim() ?? null;

  const toc = sliceBetween(
    text,
    [/^\s*목\s*차\s*$/m, /\n목차\n/],
    [/\n\s*펼쳐보기/, /\n(책소개|출판사 서평|저자 소개|추천사|회원 리뷰|상품정보|배송)/],
  );
  const intro = sliceBetween(
    text,
    [/\n책소개\n/, /\n출판사 서평\n/],
    [/\n\s*펼쳐보기/, /\n(목차|저자 소개|추천사|회원 리뷰|상품정보)/],
    2500,
  );

  return { url, title, toc, intro, fetchedAt: new Date().toISOString().slice(0, 10) };
}

const args = process.argv.slice(2);
const urls =
  args[0] === "--file"
    ? readFileSync(args[1], "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    : args;

if (urls.length === 0) {
  console.error("쓰는 법: node scripts/fetch-book-toc.mjs <상품URL> [...]  또는  --file urls.txt");
  process.exit(1);
}

for (const url of urls) {
  try {
    console.log(JSON.stringify(await fetchOne(url)));
  } catch (error) {
    console.log(JSON.stringify({ url, error: String(error.message ?? error) }));
  }
  // 서점 서버에 부담을 주지 않는다.
  await new Promise((r) => setTimeout(r, 900));
}
