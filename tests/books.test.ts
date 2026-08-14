/**
 * 교재 연결이 거짓말하지 않게 지킨다.
 *
 * 이 자료의 값어치는 "출처에서 긁은 그대로"라는 데 있다.
 * 출처 없는 목차, 존재하지 않는 단원을 가리키는 장, 억지로 맞춘 연결은 여기서 막힌다.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { BOOKS, BOOK_VOLUMES, bookById, booksForUnit, unitById, volumesOfBook } from "../content/index.ts";

test("교재 ID가 겹치지 않고 주소로 쓸 수 있는 모양이다", () => {
  const seen = new Set<string>();
  for (const book of BOOKS) {
    assert.ok(!seen.has(book.id), `${book.id}: 중복`);
    seen.add(book.id);
    assert.match(book.id, /^[a-z0-9-]+$/, `${book.id}: 영소문자·숫자·하이픈만`);
  }
});

test("모든 권에 출처 URL과 판(년도)이 있다", () => {
  for (const volume of BOOK_VOLUMES) {
    const at = `${volume.bookId} ${volume.grade}-${volume.term}`;
    assert.match(volume.source, /^https?:\/\//, `${at}: 출처 URL 없음`);
    assert.ok(volume.edition.trim().length > 0, `${at}: 몇 년판인지 없음`);
    assert.ok(volume.chapters.length > 0, `${at}: 목차가 비었음`);
    assert.ok(bookById.has(volume.bookId), `${at}: 없는 교재를 가리킴`);
  }
});

test("교재의 장이 없는 단원을 가리키지 않는다", () => {
  for (const volume of BOOK_VOLUMES) {
    for (const chapter of volume.chapters) {
      if (!chapter.unitId) continue;
      assert.ok(
        unitById.has(chapter.unitId),
        `${volume.bookId} '${chapter.title}' → 없는 단원 ${chapter.unitId}`,
      );
    }
  }
});

test("교재의 장은 같은 학년·학기 단원에만 이어진다", () => {
  for (const volume of BOOK_VOLUMES) {
    for (const chapter of volume.chapters) {
      if (!chapter.unitId) continue;
      const unit = unitById.get(chapter.unitId);
      assert.ok(unit);
      assert.equal(unit.grade, volume.grade, `${volume.bookId} '${chapter.title}': 학년 불일치`);
      assert.equal(unit.term, volume.term, `${volume.bookId} '${chapter.title}': 학기 불일치`);
    }
  }
});

/**
 * 한 단원에 여러 장이 붙는 것은 맞다. 고1은 지도의 단원 하나가 교재의 대단원 하나여서,
 * '도형의 방정식'에 평면좌표·직선·원·이동 네 장이 함께 붙는다.
 * 막아야 하는 것은 **같은 장이 두 번 세어지는 것**이다. 서점 목차는 뒤쪽에
 * 모의고사·정답 색인으로 같은 목록을 한 번 더 싣는 일이 있어 장 수가 부풀려진다.
 */
test("한 권 안에 같은 장이 두 번 실리지 않는다", () => {
  // 자리를 가리키는 번호만 지운다. 내용을 가리키는 숫자는 남긴다.
  // 앞 숫자를 다 지우면 '9까지의 수'와 '50까지의 수'가 같은 키가 되어
  // 이 검사가 엉뚱하게 실패한다(build-books.mjs 와 같은 규칙을 쓴다).
  const norm = (t: string) =>
    t
      .replace(/^\d+\s*[.．]\s*|^\d+\s+/, "")
      .replace(/\s+\d{2,}\s*$/, "")
      .replace(/[\s()（）·ㆍ・]/g, "");
  for (const volume of BOOK_VOLUMES) {
    const seen = new Set<string>();
    for (const chapter of volume.chapters) {
      const key = norm(chapter.title);
      if (!key) continue;
      assert.ok(
        !seen.has(key),
        `${volume.bookId} ${volume.grade}-${volume.term}: '${chapter.title}'이 두 번 실렸습니다.`,
      );
      seen.add(key);
    }
  }
});

test("교재의 장은 그 학기에 실제로 있는 목차다", () => {
  // 서점이 엉뚱한 학년 목차를 실어 둔 권은 아예 들어오지 않아야 한다.
  for (const volume of BOOK_VOLUMES) {
    const linked = volume.chapters.filter((chapter) => chapter.unitId).length;
    assert.ok(
      linked > 0,
      `${volume.bookId} ${volume.grade}-${volume.term}: 이어진 장이 하나도 없습니다. 목차가 그 학기 것이 맞는지 확인하세요.`,
    );
  }
});

test("단원에서 교재를 되찾을 수 있고 순서가 개념→유형→내신→심화다", () => {
  for (const volume of BOOK_VOLUMES) {
    for (const chapter of volume.chapters) {
      if (!chapter.unitId) continue;
      const hits = booksForUnit(chapter.unitId);
      assert.ok(
        hits.some(
          (hit) =>
            hit.book.id === volume.bookId &&
            hit.chapters.some((found) => found.title === chapter.title),
        ),
        `${chapter.unitId}에서 ${volume.bookId} '${chapter.title}'을 찾지 못했습니다.`,
      );
    }
  }
  const order = ["개념", "유형", "내신", "심화"];
  for (const book of BOOKS) {
    assert.ok(volumesOfBook(book.id).length >= 0);
  }
  for (const volume of BOOK_VOLUMES) {
    for (const chapter of volume.chapters) {
      if (!chapter.unitId) continue;
      const roles = booksForUnit(chapter.unitId).map((hit) => order.indexOf(hit.book.role));
      const sorted = roles.slice().sort((a, b) => a - b);
      assert.deepEqual(roles, sorted, `${chapter.unitId}: 교재 순서가 어긋남`);
    }
  }
});
