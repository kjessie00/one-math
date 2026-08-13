/**
 * 콘텐츠 무결성 검사기.
 *
 * 콘텐츠를 고친 사람은 누구든 이걸 먼저 돌린다.
 *   npm run validate
 *
 * 여기서 통과하지 못한 내용은 화면에 올리지 않는다.
 */
import {
  GRADE_ORDER,
  STRANDS,
  TERM_LABEL,
  allUnits,
  grades,
  gradeById,
  isUnitId,
  makeUnitId,
  unitById,
  unitOrder,
  unitsOfTerm,
  type Grade,
  type TermId,
  type Unit,
} from "../content/index.ts";

/**
 * 옵션
 *   --grade=e3     그 학년만 검사한다(콘텐츠 작성 중 자기 파일만 확인할 때).
 *   --skip-links   선수개념 연결 검사를 건너뛴다(연결을 채우기 전 단계에서만).
 */
const argv = process.argv.slice(2);
const onlyGrade = argv.find((arg) => arg.startsWith("--grade="))?.split("=")[1];
const skipLinks = argv.includes("--skip-links");
const scopedGrades = onlyGrade ? grades.filter((grade) => grade.id === onlyGrade) : grades;
if (onlyGrade && scopedGrades.length === 0) {
  console.error(`알 수 없는 학년: ${onlyGrade}`);
  process.exit(1);
}
const scopedUnits = onlyGrade
  ? allUnits.filter((unit) => unit.grade === onlyGrade)
  : allUnits;

const problems: string[] = [];
const warnings: string[] = [];

const fail = (message: string) => problems.push(message);
const warn = (message: string) => warnings.push(message);

const STRAND_IDS = new Set(STRANDS.map((strand) => strand.id));
const TERMS: TermId[] = ["s1", "s2"];

// 1. 학년 목록
if (!onlyGrade && grades.length !== GRADE_ORDER.length) {
  fail(`학년이 ${grades.length}개입니다. ${GRADE_ORDER.length}개여야 합니다.`);
}
for (const [index, gradeId] of onlyGrade ? [] : GRADE_ORDER.entries()) {
  if (grades[index]?.id !== gradeId) {
    fail(`학년 순서가 어긋납니다: ${index}번째가 ${grades[index]?.id}, ${gradeId}이어야 합니다.`);
  }
}

// 2. 2026학년도 적용 교육과정 회귀 검사
for (const grade of scopedGrades) {
  const expected = grade.id === "m3" ? "2015 개정 교육과정" : "2022 개정 교육과정";
  if (grade.curriculum !== expected) {
    fail(`${grade.label} 교육과정 표기가 "${grade.curriculum}"입니다. "${expected}"이어야 합니다.`);
  }
}

// 3. 학기 계획
function checkTerm(grade: Grade, term: TermId) {
  const plan = grade.terms[term];
  const where = `${grade.label} ${plan.book ?? TERM_LABEL[term]}`;
  if (plan.grade !== grade.id || plan.term !== term) {
    fail(`${where}: TermPlan의 grade/term이 위치와 다릅니다.`);
  }
  if (plan.summary.trim().length < 10) fail(`${where}: 학기 요약이 비었습니다.`);
  if (plan.focus.length !== 3) {
    fail(`${where}: 최우선 선수개념이 ${plan.focus.length}개입니다. 3개여야 합니다.`);
  }
  if (plan.focus.some((item) => !item.trim())) fail(`${where}: 빈 최우선 선수개념이 있습니다.`);
  if (plan.decision.trim().length < 10) fail(`${where}: 판정 메모가 비었습니다.`);
  if (plan.publisherNote && plan.publisherNote.trim().length < 20) {
    fail(`${where}: 발행사 안내가 너무 짧습니다.`);
  }

  const kinds = new Set(plan.diagnostics.map((item) => item.kind));
  for (const kind of ["기초", "연결", "설명"] as const) {
    if (!kinds.has(kind)) fail(`${where}: '${kind}' 진단 문항이 없습니다.`);
  }
  for (const item of plan.diagnostics) {
    for (const [field, value] of Object.entries(item)) {
      if (!String(value).trim()) fail(`${where}: 진단 문항의 ${field}이(가) 비었습니다.`);
    }
  }

  const units = unitsOfTerm(grade.id, term);
  if (units.length < 3) {
    fail(`${where}: 단원이 ${units.length}개입니다. 최소 3개가 필요합니다.`);
  }
  units.forEach((unit, index) => {
    if (unit.seq !== index + 1) {
      fail(`${unit.id}: seq가 ${unit.seq}인데 학기 안 순번은 ${index + 1}입니다.`);
    }
  });
}

for (const grade of scopedGrades) {
  for (const term of TERMS) checkTerm(grade, term);
}

// 4. 단원 자체 검사
const seenIds = new Set<string>();
for (const unit of scopedUnits) {
  const at = `${unit.id}(${unit.title})`;

  if (seenIds.has(unit.id)) fail(`${at}: 단원 ID가 중복입니다.`);
  seenIds.add(unit.id);

  if (!isUnitId(unit.id)) fail(`${at}: 단원 ID 형식이 잘못됐습니다.`);
  if (unit.id !== makeUnitId(unit.grade, unit.term, unit.seq)) {
    fail(`${at}: ID가 grade/term/seq와 맞지 않습니다. (${makeUnitId(unit.grade, unit.term, unit.seq)} 이어야 함)`);
  }
  if (!gradeById.get(unit.grade)?.units.includes(unit)) {
    fail(`${at}: ${unit.grade} 학년 파일 밖에 있습니다.`);
  }
  if (!STRAND_IDS.has(unit.strand)) fail(`${at}: 알 수 없는 영역 '${unit.strand}'.`);

  const required: Array<[string, string]> = [
    ["title", unit.title],
    ["goal", unit.goal],
    ["risk", unit.risk],
    ["teach", unit.teach],
    ["gate.question", unit.gate.question],
    ["gate.answer", unit.gate.answer],
    ["gate.signal", unit.gate.signal],
    ["gate.fix", unit.gate.fix],
  ];
  for (const [field, value] of required) {
    if (!value?.trim()) fail(`${at}: ${field}이(가) 비었습니다.`);
  }
  if (unit.keywords.length < 2) fail(`${at}: 검색 핵심어가 ${unit.keywords.length}개입니다. 2개 이상 필요합니다.`);
  if (unit.needsCheck) warn(`${at}: 확인 필요 — ${unit.needsCheck}`);
  if (unit.publisherNote && unit.publisherNote.trim().length < 20) {
    fail(`${at}: 발행사 안내가 너무 짧습니다. 무엇이 어떻게 다른지 구체적으로 적어야 합니다.`);
  }
}

// 5. 연결(그래프) 검사 — 이 프로젝트의 핵심
const linkedFrom = new Set<string>();
for (const unit of skipLinks ? [] : allUnits) {
  const at = `${unit.id}(${unit.title})`;
  const seenLinks = new Set<string>();

  for (const link of unit.prereq) {
    if (!unitById.has(link.id)) {
      fail(`${at}: 없는 단원 '${link.id}'을 선수개념으로 가리킵니다.`);
      continue;
    }
    if (link.id === unit.id) fail(`${at}: 자기 자신을 선수개념으로 가리킵니다.`);
    if (seenLinks.has(link.id)) fail(`${at}: 선수개념 '${link.id}'이 중복입니다.`);
    seenLinks.add(link.id);
    if (unitOrder(link.id) >= unitOrder(unit.id)) {
      fail(`${at}: 뒤에 배우는 '${link.id}'을 선수개념으로 가리킵니다.`);
    }
    if (!link.why?.trim()) fail(`${at}: '${link.id}' 연결에 이유가 없습니다.`);
    linkedFrom.add(link.id);
  }

  // 맨 앞 학기를 빼면 모든 단원은 어딘가에서 이어져 와야 한다.
  const isRoot = unit.grade === "e1" && unit.term === "s1";
  if (!isRoot && unit.prereq.length === 0) {
    fail(`${at}: 선수개념 연결이 하나도 없습니다.`);
  }
}

// 6. 흐름이 끊긴 단원 — 아무 데로도 이어지지 않는 중간 단원
//
// 아래는 초1~고1 범위 안에서 정말로 마지막인 자리다. 2026-08-13 연결 구조 검토에서
// 하나씩 판정했고, 이어질 곳이 고2 이후에 있거나(삼각비 → 삼각함수) 이 범위에서
// 후속 단원이 없다(행렬, 통계). 새로 늘어난 끊김만 눈에 띄게 하려고 여기서 뺀다.
const TERMINAL_OK: Record<string, string> = {
  "e6-s2-03": "공간과 입체는 초등 도형 감각의 마무리다. 중학 입체도형은 성질·계산으로 갈래가 갈린다.",
  "m2-s2-04": "평행선 사이 선분 길이의 비는 닮음 활용의 마무리다.",
  "m3-s2-01": "삼각비는 고2 삼각함수로 이어진다. 이 범위에는 후속이 없다.",
  "m3-s2-03": "중3 통계는 고2 확률과 통계로 이어진다.",
  "h1-s1-05": "경우의 수와 순열·조합은 고2 확률과 통계로 이어진다.",
  "h1-s1-06": "행렬은 2022 개정에서 공통수학1이 마지막이다.",
};

const lastGradeStart = unitOrder(makeUnitId("h1", "s2", 1));
for (const unit of skipLinks ? [] : allUnits) {
  if (unitOrder(unit.id) >= lastGradeStart) continue;
  if (linkedFrom.has(unit.id)) {
    if (TERMINAL_OK[unit.id]) {
      warn(`${unit.id}(${unit.title}): 끝나는 자리로 적어 뒀는데 이제 뒤에서 씁니다. TERMINAL_OK에서 빼세요.`);
    }
    continue;
  }
  if (TERMINAL_OK[unit.id]) continue;
  warn(`${unit.id}(${unit.title}): 이후 어떤 단원도 이 단원을 선수개념으로 쓰지 않습니다.`);
}

// 7. 범위 회귀 검사 — 과거에 실제로 났던 오류를 다시 막는다
const h1 = onlyGrade && onlyGrade !== "h1" ? undefined : gradeById.get("h1");
if (h1) {
  const cm2Text = h1.units
    .filter((unit) => unit.term === "s2")
    .map((unit) => `${unit.title} ${unit.goal} ${unit.keywords.join(" ")}`)
    .join(" ");
  for (const banned of ["순열", "조합", "행렬"]) {
    if (cm2Text.includes(banned)) {
      fail(`고1 공통수학2에 '${banned}'이(가) 있습니다. 공통수학1 영역입니다.`);
    }
  }
  const cm1Titles = h1.units.filter((unit) => unit.term === "s1").map((unit) => unit.title).join(" ");
  for (const banned of ["도형의 방정식", "집합과 명제", "함수와 그래프"]) {
    if (cm1Titles.includes(banned)) {
      fail(`고1 공통수학1에 '${banned}'이(가) 있습니다. 공통수학2 영역입니다.`);
    }
  }
}

// 8. 사용자가 명시적으로 뺀 내용이 다시 들어오지 않게
const wholeText = JSON.stringify(scopedGrades);
for (const banned of ["90분", "3-station", "3 스테이션", "스테이션 운영"]) {
  if (wholeText.includes(banned)) {
    fail(`제외하기로 한 내용 '${banned}'이(가) 콘텐츠에 들어 있습니다.`);
  }
}

// 결과
const counts = {
  학년: scopedGrades.length,
  단원: scopedUnits.length,
  연결: scopedUnits.reduce((sum: number, unit: Unit) => sum + unit.prereq.length, 0),
  확인필요: scopedUnits.filter((unit: Unit) => unit.needsCheck).length,
  발행사안내:
    scopedUnits.filter((unit: Unit) => unit.publisherNote).length +
    scopedGrades.flatMap((grade) => TERMS.map((term) => grade.terms[term])).filter(
      (plan) => plan.publisherNote,
    ).length,
};
console.log(`검사 대상 — 학년 ${counts.학년}개 · 단원 ${counts.단원}개 · 연결 ${counts.연결}개`);
console.log(`확인 필요 ${counts.확인필요}건 · 발행사 안내 ${counts.발행사안내}건`);

if (warnings.length) {
  console.log(`\n주의 ${warnings.length}건`);
  for (const message of warnings) console.log(`  · ${message}`);
}

if (problems.length) {
  console.error(`\n오류 ${problems.length}건`);
  for (const message of problems) console.error(`  ✗ ${message}`);
  process.exit(1);
}

console.log("\n콘텐츠 무결성 검사 통과");
