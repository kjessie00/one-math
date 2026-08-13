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
  "m3.units.m3-s2-03.goal": {
    value: "대푯값과 산포도로 자료의 중심과 퍼짐을 해석하고, 산점도로 두 자료의 상관관계를 말합니다.",
    why: "원문은 '대푯값·산포도·상관관계로 자료의 중심과 퍼짐을 해석합니다.'였다. 상관관계는 한 자료의 중심이나 퍼짐을 보는 도구가 아니라 두 변량이 함께 어떻게 변하는지를 보는 것이다(2015 개정 [9수05-08] 산점도와 상관관계). 세 개념을 한 줄에 묶으면 상관관계로 중심·퍼짐을 본다는 뜻이 된다. 2026-08-13 수학 내용 검수에서 발견해 개념 묶음을 갈랐다.",
  },
  "e1.units.e1-s2-04.goal": {
    value: "받아올림·받아내림 없이 두 자리 수를 더하고 뺍니다. (몇십몇＋몇, 몇십＋몇십, 몇십몇＋몇십몇)",
    why: "이 문장은 원래 4단원에 붙어 있었고 자리 교환으로 6단원(현재 e1-s2-06)에 왔다. 원문 '받아올림 없이 한 자리 수를 더해 십몇을 만들고 십몇에서 뺍니다.'는 (십몇)±(몇)까지만 말해, 실제 6단원 범위인 두 자리 수 계산보다 좁고 같은 단원의 핵심어(몇십몇 더하기 몇, 몇십 더하기 몇십, 몇십몇 더하기 몇십몇)와도 어긋났다. 2026-08-13 수학 내용 검수에서 발견해 단원 범위에 맞게 넓혔다. 키가 e1-s2-04인 것은 스냅샷 기준 ID이며, 지금 이 문장은 e1-s2-06에 있다.",
  },
  "m2.s2Diagnostics.1.signal": {
    value: "x=1.5이면 3÷2만 계산해 그대로 x에 적었습니다.",
    why: "원문은 'x=1.5이면 대응 순서를 바꿨습니다.'였다. x:4=3:2에서 2x=12이므로 x=6이고, 대응 순서를 바꾸면 8/3이 나오지 1.5가 나오지 않는다. 1.5는 오른쪽 비 3÷2만 계산한 값이다. 2026-08-13 수학 내용 검수에서 발견해 고쳤다.",
  },
  "m2.units.m2-s2-03.gate.signal": {
    value: "12이면 4×6을 먼저 계산하고 남은 2로 나누지 않았습니다.",
    why: "원문은 '12이면 비례식의 대응 순서가 무너졌습니다.'였다. 4:6=2:x에서 4x=12이므로 x=3이고, 대응 순서를 바꾸면 4/3이 나오지 12가 나오지 않는다. 12는 4×6÷2의 중간값이다. 2026-08-13 수학 내용 검수에서 발견해 고쳤다.",
  },
  "e4.s2Diagnostics.1.signal": {
    value: "110°이면 180°에서 70°만 빼고 60°를 빼지 않았습니다. 130°이면 두 각을 더하기만 하고 180°에서 빼지 않았습니다.",
    why: "원문은 '110°이면 합 180°를 쓰지 못합니다.'였다. 110은 180−70이라 오히려 180을 쓴 값이고, 180을 아예 쓰지 않으면 60+70=130이 나온다. 설명이 오답의 원인을 반대로 짚고 있었다. 2026-08-13 수학 내용 검수에서 발견해 두 오답을 갈라 적었다.",
  },
  "m1.units.m1-s2-03.gate.signal": {
    value: "110°이면 180°에서 70°만 빼고 60°를 빼지 않았습니다.",
    why: "원문은 '110°이면 세 각의 합을 사용하지 못합니다.'였다. 110은 180−70이므로 세 각의 합은 쓴 것이고, 빼야 할 각 하나를 빠뜨린 것이다. 초4 2학기 진단의 같은 문항과 같은 오류였다. 2026-08-13 수학 내용 검수에서 발견해 고쳤다.",
  },
  "e4.units.e4-s2-06.gate.signal": {
    value: "육각형이면 처음 꼭짓점을 끝에서 다시 세어 6으로 셌을 수 있습니다.",
    why: "원문은 '육각형이면 꼭짓점과 변을 중복해 셌을 수 있습니다.'였다. 오각형은 변 5개·꼭짓점 5개라 둘을 중복해 세면 10이 되지 6이 되지 않는다. 6은 한 바퀴 돌며 시작 꼭짓점을 끝에서 한 번 더 셀 때 나온다. 2026-08-13 수학 내용 검수에서 발견해 고쳤다.",
  },
  "m1.s2Diagnostics.0.signal": {
    value: "x=7이면 3을 옮기며 부호를 바꾸지 않아 2x=14로 보았습니다.",
    why: "원문은 'x=7이면 3을 옮긴 뒤 2로 나누지 않았습니다.'였다. 3을 바르게 옮기고 나누지 않으면 2x=8에서 8이 나오지 x=7이 나오지 않는다. 7은 2x=11+3=14로 부호를 바꾸지 않았을 때 나온다. 2026-08-13 숫자 155문항 전수 재계산에서 발견해 고쳤다.",
  },
  "m1.units.m1-s2-04.gate.signal": {
    value: "5이면 가로와 세로를 곱하지 않고 더했습니다.",
    why: "원문은 '5이면 둘레 계산과 혼동합니다.'였다. 가로 2·세로 3인 직사각형의 둘레는 2×(2+3)=10이라 5를 둘레로 설명할 수 없다. 5는 가로와 세로를 더한 값이다. 2026-08-13 독립 검토에서 발견해 고쳤다.",
  },
  "e4.units.e4-s2-04.goal": {
    value: "수직·평행을 이용해 여러 가지 사각형을 분류하고 성질을 탐구합니다.",
    why: "원문은 '수직·평행을 이용해 여러 사각형의 포함 관계를 이해합니다.'였다. 교육부 고시 제2022-33호 [별책 8] 초3~4학년군 성취기준 적용 시 고려 사항이 '여러 가지 사각형의 성질은 구체적인 조작 활동을 통하여 간단한 것만 다루고, 여러 가지 사각형 사이의 관계는 다루지 않는다.'라고 명시적으로 배제한다. 포함 관계는 중2 [9수03-11]에서 다룬다. 2026-08-13 고시 원문(HWP) 대조로 확인해 성취기준 문구에 맞게 고쳤다.",
  },
  "m2.units.m2-s2-05.gate.signal": {
    value: "12.5이면 넓이를 반으로 나눠 한 변을 구했습니다.",
    why: "원문은 '12.5이면 넓이와 둘레를 혼동합니다.'였다. 12.5는 25÷2이고, 둘레가 25라면 한 변은 6.25라서 둘레 혼동으로 설명할 수 없다. 같은 유형인 m3-s1-01 관문은 이 오답을 '넓이를 반으로 나눴다'로 바르게 설명한다. 2026-08-13 독립 검토에서 발견해 고쳤다.",
  },
};

/**
 * 문구는 그대로 두고 **붙어 있던 단원만 바꾼** 경우.
 *
 * 이식 원문의 문장을 고치는 것보다 훨씬 보수적인 수정이다. 한 글자도 다시 쓰지 않고,
 * 어느 단원의 내용인지만 바로잡는다. 키는 "얼려 둔 스냅샷의 단원 ID", 값은 "지금 그 내용을 담고 있는 단원 ID".
 */
const RELOCATED: Record<string, { to: string; why: string }> = {
  "e1-s2-04": {
    to: "e1-s2-06",
    why: "2022 개정 초1-2 교과서에서 4단원 ‘덧셈과 뺄셈(2)’는 받아올림·받아내림이 있는 (몇)+(몇)=(십몇)이고, 받아올림 없는 두 자리 수 계산은 6단원 ‘덧셈과 뺄셈(3)’이다. 이식본은 두 단원의 내용이 서로 바뀌어 있었다. EBS 만점왕 수학 1-2 공식 강좌 목차(2022개정)와 매쓰포올·학제소 차시 구성으로 확인했다. 초1~2 수학은 2022 개정에서도 국정이라 발행사별 차이는 없다. 2026-08-13 조사·반증 검토에서 발견해 문장은 그대로 두고 자리만 맞바꿨다.",
  },
  "e1-s2-06": {
    to: "e1-s2-04",
    why: "위 교환의 반대쪽이다. 이식본에서 6단원에 붙어 있던 '10 만들기로 받아올림·받아내림이 있는 계산'은 실제로는 4단원 내용이므로 4단원 자리로 옮겼다. 두 단원의 prereq와, 초2 '덧셈과 뺄셈'이 이 둘을 가리키던 이유 문장도 함께 맞바꿔 앞뒤가 어긋나지 않게 했다.",
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
      // 자리를 옮긴 내용은 옮겨 간 단원에서 찾아 대조한다.
      const relocation = RELOCATED[expectedUnit.id];
      const liveId = relocation?.to ?? expectedUnit.id;
      if (relocation) used.add(`relocated:${expectedUnit.id}`);

      const unit: Unit | undefined = grade.units.find((item) => item.id === liveId);
      assert.ok(unit, `${expectedUnit.id}(${expectedUnit.title}) 단원이 사라졌습니다.`);
      assert.equal(unit.origin, "ported", `${unit.id}: origin이 ported가 아닙니다.`);
      // 단원명은 자리(순번)에 붙어 있으므로 옮긴 경우에는 대조하지 않는다.
      if (!relocation) {
        assert.equal(unit.title, expectedUnit.title, `${unit.id}: 단원명이 바뀌었습니다.`);
      }
      assert.equal(
        unit.goal,
        expectedValue(`${gradeId}.units.${expectedUnit.id}.goal`, expectedUnit.goal),
        `${unit.id}: 목표 문장이 바뀌었습니다.`,
      );
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
  const staleMoves = Object.keys(RELOCATED).filter((key) => !used.has(`relocated:${key}`));
  assert.deepEqual(staleMoves, [], "더 이상 적용되지 않는 이동 기록이 남아 있습니다.");
  for (const [key, move] of Object.entries(RELOCATED)) {
    assert.ok(move.why.length > 20, `${key}: 옮긴 이유가 너무 짧습니다.`);
  }
  for (const [key, correction] of Object.entries(CORRECTED)) {
    assert.ok(correction.why.length > 20, `${key}: 수정 이유가 너무 짧습니다.`);
  }
});

test("2학기 단원이 53개 그대로 남아 있다", () => {
  const ported = Object.values(snapshot).reduce((sum, grade) => sum + grade.s2Units.length, 0);
  assert.equal(ported, 53);
});
