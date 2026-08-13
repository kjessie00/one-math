/**
 * 이미 검토가 끝난 2학기 교육 문구가 그대로 남아 있는지 지킨다.
 *
 * 이 프로젝트에서 가장 비싼 자산은 코드가 아니라, 교육과정과 대조해 사람이 고친 문장이다.
 * 구조를 바꾸거나 연결을 붙이는 과정에서 문장이 조용히 달라지면 여기서 실패한다.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { gradeById, type Grade, type Unit } from "../content/index.ts";

type PortedUnit = {
  id: string;
  title: string;
  goal: string;
  sameText: string;
  priorText: string;
  risk: string;
  teach: string;
  gate: { question: string; answer: string; signal: string; fix: string };
};

type PortedGrade = {
  s2Summary: string;
  s2Focus: string[];
  s2Decision: string;
  s2Diagnostics: { kind: string; question: string; answer: string; signal: string; fix: string }[];
  s2Units: PortedUnit[];
};

const snapshot: Record<string, PortedGrade> = JSON.parse(
  readFileSync(
    path.join(import.meta.dirname, "fixtures/ported-s2-snapshot.json"),
    "utf8",
  ),
);

/**
 * 이식 원문에서 **사실이 틀려** 고친 곳.
 *
 * 원칙은 이식 문구를 그대로 두는 것이다. 다만 계산이나 사실이 어긋난 문장까지 지킬 이유는 없다.
 * 고친 자리는 반드시 여기에 이유와 함께 남기고, 여기 없는 변경은 테스트가 막는다.
 */
const CORRECTED: Record<string, { value: string; why: string }> = {
  "m3.s2Diagnostics.1.signal": {
    value: "14이면 두 직각변을 그대로 더했습니다.",
    why: "원문은 '14이면 세 변을 단순히 더했습니다.'였다. 6+8=14는 두 직각변의 합이고 세 변의 합은 24라서 설명이 맞지 않았다. 2026-08-13 독립 검토에서 발견해 고쳤다.",
  },
  "m1.units.m1-s2-04.gate.signal": {
    value: "5이면 가로와 세로를 곱하지 않고 더했습니다.",
    why: "원문은 '5이면 둘레 계산과 혼동합니다.'였다. 가로 2·세로 3인 직사각형의 둘레는 2×(2+3)=10이라 5를 둘레로 설명할 수 없다. 5는 가로와 세로를 더한 값이다. 2026-08-13 독립 검토에서 발견해 고쳤다.",
  },
  "m2.units.m2-s2-05.gate.signal": {
    value: "12.5이면 넓이를 반으로 나눠 한 변을 구했습니다.",
    why: "원문은 '12.5이면 넓이와 둘레를 혼동합니다.'였다. 12.5는 25÷2이고, 둘레가 25라면 한 변은 6.25라서 둘레 혼동으로 설명할 수 없다. 같은 유형인 m3-s1-01 관문은 이 오답을 '넓이를 반으로 나눴다'로 바르게 설명한다. 2026-08-13 독립 검토에서 발견해 고쳤다.",
  },
};

const used = new Set<string>();

/** 스냅샷 값에 확정된 수정만 덮어씌운다. */
function expectedValue(key: string, original: string): string {
  const correction = CORRECTED[key];
  if (!correction) return original;
  used.add(key);
  return correction.value;
}

test("이식한 2학기 단원 문구가 한 글자도 바뀌지 않았다", () => {
  for (const [gradeId, expected] of Object.entries(snapshot)) {
    const grade: Grade | undefined = gradeById.get(gradeId as never);
    assert.ok(grade, `${gradeId} 학년이 사라졌습니다.`);

    for (const expectedUnit of expected.s2Units) {
      const unit: Unit | undefined = grade.units.find((item) => item.id === expectedUnit.id);
      assert.ok(unit, `${expectedUnit.id}(${expectedUnit.title}) 단원이 사라졌습니다.`);
      assert.equal(unit.origin, "ported", `${unit.id}: origin이 ported가 아닙니다.`);
      assert.equal(unit.title, expectedUnit.title, `${unit.id}: 단원명이 바뀌었습니다.`);
      assert.equal(unit.goal, expectedUnit.goal, `${unit.id}: 목표 문장이 바뀌었습니다.`);
      assert.equal(unit.sameText, expectedUnit.sameText, `${unit.id}: 같은 학년 선수개념 서술이 바뀌었습니다.`);
      assert.equal(unit.priorText, expectedUnit.priorText, `${unit.id}: 전 학년 선수개념 서술이 바뀌었습니다.`);
      assert.equal(unit.risk, expectedUnit.risk, `${unit.id}: 오답 신호 문장이 바뀌었습니다.`);
      assert.equal(unit.teach, expectedUnit.teach, `${unit.id}: 교수법 문장이 바뀌었습니다.`);
      assert.deepEqual(
        unit.gate,
        {
          ...expectedUnit.gate,
          signal: expectedValue(
            `${gradeId}.units.${expectedUnit.id}.gate.signal`,
            expectedUnit.gate.signal,
          ),
        },
        `${unit.id}: 관문 진단이 바뀌었습니다.`,
      );
    }
  }
});

test("이식한 2학기 학기 계획이 그대로다", () => {
  for (const [gradeId, expected] of Object.entries(snapshot)) {
    const plan = gradeById.get(gradeId as never)?.terms.s2;
    assert.ok(plan, `${gradeId} 2학기 계획이 사라졌습니다.`);
    assert.equal(plan.summary, expected.s2Summary, `${gradeId}: 2학기 요약이 바뀌었습니다.`);
    assert.deepEqual(plan.focus, expected.s2Focus, `${gradeId}: 최우선 선수개념이 바뀌었습니다.`);
    assert.equal(plan.decision, expected.s2Decision, `${gradeId}: 판정 메모가 바뀌었습니다.`);
    assert.deepEqual(
      plan.diagnostics,
      expected.s2Diagnostics.map((item, index) => ({
        ...item,
        signal: expectedValue(`${gradeId}.s2Diagnostics.${index}.signal`, item.signal),
      })),
      `${gradeId}: 2학기 미니 진단이 바뀌었습니다.`,
    );
  }
});

test("기록해 둔 이식 원문 수정이 모두 실제로 쓰이고 있다", () => {
  const stale = Object.keys(CORRECTED).filter((key) => !used.has(key));
  assert.deepEqual(stale, [], "더 이상 적용되지 않는 수정 기록이 남아 있습니다.");
  for (const [key, correction] of Object.entries(CORRECTED)) {
    assert.ok(correction.why.length > 20, `${key}: 수정 이유가 너무 짧습니다.`);
  }
});

test("2학기 단원이 53개 그대로 남아 있다", () => {
  const ported = Object.values(snapshot).reduce((sum, grade) => sum + grade.s2Units.length, 0);
  assert.equal(ported, 53);
});
