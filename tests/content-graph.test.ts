/**
 * 지도가 지도로서 성립하는지 확인한다.
 * 여기서 실패하면 화면에 그려지는 연결이 거짓말이 된다.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  GRADE_ORDER,
  STRANDS,
  allUnits,
  grades,
  isUnitId,
  leadsToOf,
  makeUnitId,
  prerequisitesOf,
  searchUnits,
  traceBack,
  unitById,
  unitOrder,
  unitsOfTerm,
} from "../content/index.ts";

test("10개 학년이 순서대로 있고 학년 ID가 겹치지 않는다", () => {
  assert.deepEqual(
    grades.map((grade) => grade.id),
    GRADE_ORDER,
  );
  assert.equal(new Set(grades.map((grade) => grade.id)).size, 10);
});

test("2026학년도 적용 교육과정이 맞다 — 중3만 2015 개정", () => {
  for (const grade of grades) {
    const expected = grade.id === "m3" ? "2015 개정 교육과정" : "2022 개정 교육과정";
    assert.equal(grade.curriculum, expected, `${grade.label} 교육과정 표기`);
  }
});

test("모든 학년에 1학기와 2학기 단원이 있다", () => {
  for (const grade of grades) {
    for (const term of ["s1", "s2"] as const) {
      assert.ok(
        unitsOfTerm(grade.id, term).length >= 3,
        `${grade.label} ${term}에 단원이 부족합니다.`,
      );
    }
  }
});

test("단원 ID가 형식에 맞고 중복이 없다", () => {
  const seen = new Set<string>();
  for (const unit of allUnits) {
    assert.ok(isUnitId(unit.id), `${unit.id}: ID 형식`);
    assert.equal(unit.id, makeUnitId(unit.grade, unit.term, unit.seq), `${unit.id}: ID 구성 요소 불일치`);
    assert.ok(!seen.has(unit.id), `${unit.id}: 중복`);
    seen.add(unit.id);
  }
});

test("모든 단원에 목표·오답 신호·교수법·관문 진단이 있다", () => {
  for (const unit of allUnits) {
    for (const [field, value] of [
      ["goal", unit.goal],
      ["risk", unit.risk],
      ["teach", unit.teach],
      ["gate.question", unit.gate.question],
      ["gate.answer", unit.gate.answer],
      ["gate.signal", unit.gate.signal],
      ["gate.fix", unit.gate.fix],
    ] as const) {
      assert.ok(value.trim().length > 0, `${unit.id}: ${field} 비어 있음`);
    }
    assert.ok(unit.keywords.length >= 2, `${unit.id}: 검색 핵심어 부족`);
  }
});

test("모든 학기에 기초·연결·설명 진단이 있다", () => {
  for (const grade of grades) {
    for (const term of ["s1", "s2"] as const) {
      const kinds = new Set(grade.terms[term].diagnostics.map((item) => item.kind));
      for (const kind of ["기초", "연결", "설명"] as const) {
        assert.ok(kinds.has(kind), `${grade.label} ${term}: ${kind} 진단 없음`);
      }
      assert.equal(grade.terms[term].focus.length, 3, `${grade.label} ${term}: 최우선 3개`);
    }
  }
});

test("선수개념 연결이 끊긴 곳이 없다", () => {
  for (const unit of allUnits) {
    for (const link of unit.prereq) {
      assert.ok(unitById.has(link.id), `${unit.id} → ${link.id}: 없는 단원을 가리킴`);
      assert.ok(link.why.trim().length > 0, `${unit.id} → ${link.id}: 연결 이유 없음`);
    }
  }
});

test("선수개념은 언제나 앞서 배우는 단원이다", () => {
  for (const unit of allUnits) {
    for (const link of unit.prereq) {
      assert.ok(
        unitOrder(link.id) < unitOrder(unit.id),
        `${unit.id}이(가) 뒤에 나오는 ${link.id}을 선수개념으로 가리킵니다.`,
      );
    }
  }
});

test("초1 1학기를 뺀 모든 단원은 어딘가에서 이어져 온다", () => {
  for (const unit of allUnits) {
    if (unit.grade === "e1" && unit.term === "s1") continue;
    assert.ok(unit.prereq.length > 0, `${unit.id}(${unit.title}): 연결이 하나도 없습니다.`);
  }
});

test("고1 공통수학2에 순열·조합·행렬이 들어가지 않는다", () => {
  const cm2 = unitsOfTerm("h1", "s2");
  const text = cm2.map((unit) => `${unit.title} ${unit.goal} ${unit.keywords.join(" ")}`).join(" ");
  for (const banned of ["순열", "조합", "행렬"]) {
    assert.ok(!text.includes(banned), `공통수학2에 '${banned}'이 있습니다.`);
  }
  assert.ok(cm2.length > 0);
});

test("고1 공통수학1에 도형의 방정식·집합과 명제가 들어가지 않는다", () => {
  const titles = unitsOfTerm("h1", "s1").map((unit) => unit.title).join(" ");
  for (const banned of ["도형의 방정식", "집합과 명제"]) {
    assert.ok(!titles.includes(banned), `공통수학1에 '${banned}'이 있습니다.`);
  }
});

test("제외하기로 한 고정 수업 운영안이 다시 들어오지 않았다", () => {
  const text = JSON.stringify(grades);
  for (const banned of ["90분", "3-station", "3 스테이션"]) {
    assert.ok(!text.includes(banned), `'${banned}'이 콘텐츠에 있습니다.`);
  }
});

test("모든 영역에 단원이 하나 이상 있다", () => {
  for (const strand of STRANDS) {
    const count = allUnits.filter((unit) => unit.strand === strand.id).length;
    assert.ok(count > 0, `${strand.name} 영역이 비어 있습니다.`);
  }
});

test("복구 경로와 다음 단원 계산이 실제로 동작한다", () => {
  const target = allUnits.find((unit) => unit.grade === "h1" && unit.term === "s2");
  assert.ok(target);
  const levels = traceBack(target.id);
  assert.ok(levels.length > 0, "고1 단원에서 거슬러 올라가는 경로가 없습니다.");
  assert.ok(prerequisitesOf(target.id).length > 0);

  const withNext = allUnits.find((unit) => leadsToOf(unit.id).length > 0);
  assert.ok(withNext, "다음으로 이어지는 단원이 하나도 없습니다.");
});

test("검색이 학년을 가리지 않고 찾는다", () => {
  const hits = searchUnits("분수");
  assert.ok(hits.length >= 3, "‘분수’ 검색 결과가 너무 적습니다.");
  assert.ok(new Set(hits.map((unit) => unit.grade)).size >= 2, "한 학년에서만 나옵니다.");
});
