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

test("한 권 안에서 같은 단원에 두 장이 겹쳐 붙지 않는다", () => {
  for (const volume of BOOK_VOLUMES) {
    const seen = new Set<string>();
    for (const chapter of volume.chapters) {
      if (!chapter.unitId) continue;
      assert.ok(
        !seen.has(chapter.unitId),
        `${volume.bookId} ${volume.grade}-${volume.term}: ${chapter.unitId}에 장이 두 개 붙었습니다.`,
      );
      seen.add(chapter.unitId);
    }
  }
});

test("단원에서 교재를 되찾을 수 있고 순서가 개념→유형→내신→심화다", () => {
  for (const volume of BOOK_VOLUMES) {
    for (const chapter of volume.chapters) {
      if (!chapter.unitId) continue;
      const hits = booksForUnit(chapter.unitId);
      assert.ok(
        hits.some((hit) => hit.book.id === volume.bookId && hit.chapter.title === chapter.title),
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
