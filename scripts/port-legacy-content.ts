/**
 * 2026-08 검토 완료된 2학기 콘텐츠(app/curriculum.ts)를 새 스키마로 기계적으로 옮긴다.
 *
 * 규칙: 교육 문구는 한 글자도 바꾸지 않는다. 구조만 바꾼다.
 * 옮긴 원문은 tests/fixtures/ported-s2-snapshot.json 으로 얼려서
 * 이후 어떤 작업도 이 문구를 건드리지 못하게 테스트로 막는다.
 *
 * 실행: node --experimental-strip-types scripts/port-legacy-content.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const LEGACY =
  "/Users/jessiek/Documents/Codex/2026-08-10/realtime-voice-chat/work/app/curriculum.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

type LegacyGate = { question: string; answer: string; signal: string; fix: string };
type LegacyUnit = {
  title: string;
  goal: string;
  same: string;
  prior: string;
  risk: string;
  teach: string;
  gate: LegacyGate;
};
type LegacyDiagnostic = {
  kind: string;
  question: string;
  answer: string;
  signal: string;
  fix: string;
};
type LegacyGrade = {
  id: string;
  school: string;
  label: string;
  curriculum: string;
  summary: string;
  focus: string[];
  units: LegacyUnit[];
  diagnostics: LegacyDiagnostic[];
  decision: string;
};

/**
 * 안전장치. 이 스크립트는 2026-08-13에 한 번 돌리고 끝난 기록이다.
 * 지금 다시 돌리면 1학기 단원과 선수개념 연결을 통째로 날린다.
 */
const alreadyExtended = existsSync(path.join(ROOT, "content/grades/e1.ts"))
  ? readFileSync(path.join(ROOT, "content/grades/e1.ts"), "utf8").includes('origin: "new"')
  : false;

if (alreadyExtended && !process.argv.includes("--force")) {
  console.error(
    "content/grades 에 이미 새로 쓴 단원이 있습니다. 이 스크립트를 다시 돌리면 1학기 내용과 선수개념 연결이 사라집니다.\n" +
      "정말 처음 상태로 되돌리려면 --force 를 붙이세요.",
  );
  process.exit(1);
}

const { grades } = (await import(LEGACY)) as { grades: LegacyGrade[] };

const FULL_LABEL: Record<string, string> = {
  e1: "초등학교 1학년",
  e2: "초등학교 2학년",
  e3: "초등학교 3학년",
  e4: "초등학교 4학년",
  e5: "초등학교 5학년",
  e6: "초등학교 6학년",
  m1: "중학교 1학년",
  m2: "중학교 2학년",
  m3: "중학교 3학년",
  h1: "고등학교 1학년",
};

/** 제목 기반 1차 영역 배정. 콘텐츠 담당이 학년별로 다시 검토한다. */
const STRAND_RULES: Array<[RegExp, string]> = [
  [/집합|명제|증명/, "log"],
  [/경우의 ?수|확률|가능성|평균|자료|통계|그래프와 표|막대|꺾은선|띠그래프|원그래프|비율그래프/, "dat"],
  [/규칙|비례|비와 |비율|문자와 식|방정식|부등식|함수|일차식|이차식|다항식의 활용|좌표평면과 그래프|정비례|반비례|변화/, "rel"],
  [/도형|모양|각|삼각형|사각형|다각형|원|입체|넓이|부피|둘레|길이|무게|들이|시각|시간|측정|합동|닮음|피타고라스|삼각비|대칭|각도|평면/, "geo"],
  [/수|덧셈|뺄셈|곱셈|나눗셈|분수|소수|약수|배수|자연수|정수|유리수|무리수|실수|제곱근|다항식|인수분해|어림/, "num"],
];

function guessStrand(title: string): string {
  for (const [pattern, strand] of STRAND_RULES) {
    if (pattern.test(title)) return strand;
  }
  return "num";
}

const s = (value: unknown) => JSON.stringify(value);

function unitLiteral(gradeId: string, unit: LegacyUnit, index: number): string {
  const seq = index + 1;
  const id = `${gradeId}-s2-${String(seq).padStart(2, "0")}`;
  return `    {
      id: ${s(id)},
      grade: ${s(gradeId)},
      term: "s2",
      seq: ${seq},
      strand: ${s(guessStrand(unit.title))},
      title: ${s(unit.title)},
      goal: ${s(unit.goal)},
      keywords: [],
      prereq: [],
      sameText: ${s(unit.same)},
      priorText: ${s(unit.prior)},
      risk: ${s(unit.risk)},
      teach: ${s(unit.teach)},
      gate: {
        question: ${s(unit.gate.question)},
        answer: ${s(unit.gate.answer)},
        signal: ${s(unit.gate.signal)},
        fix: ${s(unit.gate.fix)},
      },
      origin: "ported",
    },`;
}

function diagnosticLiteral(item: LegacyDiagnostic): string {
  return `      {
        kind: ${s(item.kind)},
        question: ${s(item.question)},
        answer: ${s(item.answer)},
        signal: ${s(item.signal)},
        fix: ${s(item.fix)},
      },`;
}

/**
 * 2026학년도 적용 교육과정. 원본은 "· 2026 적용", "· 공통수학2" 같은 꼬리표가 섞여 있어
 * 학년 메타는 교육과정 이름만 남기고, 과목명은 학기(TermPlan.book)로 옮긴다.
 */
const CURRICULUM: Record<string, string> = {
  e1: "2022 개정 교육과정",
  e2: "2022 개정 교육과정",
  e3: "2022 개정 교육과정",
  e4: "2022 개정 교육과정",
  e5: "2022 개정 교육과정",
  e6: "2022 개정 교육과정",
  m1: "2022 개정 교육과정",
  m2: "2022 개정 교육과정",
  m3: "2015 개정 교육과정",
  h1: "2022 개정 교육과정",
};

const TERM_BOOK: Record<string, Record<string, string>> = {
  h1: { s1: "공통수학1", s2: "공통수학2" },
};

const bookLine = (gradeId: string, term: string) =>
  TERM_BOOK[gradeId]?.[term] ? `\n      book: ${s(TERM_BOOK[gradeId][term])},` : "";

const snapshot: Record<string, unknown> = {};

mkdirSync(path.join(ROOT, "content/grades"), { recursive: true });
mkdirSync(path.join(ROOT, "tests/fixtures"), { recursive: true });

for (const grade of grades) {
  const file = `import type { Grade } from "../schema";

/**
 * ${FULL_LABEL[grade.id]} (${grade.curriculum})
 *
 * 2학기 단원은 2026-08 검토 완료본에서 문구 그대로 옮긴 것이다(origin: "ported").
 * 이 문구는 tests/ported-content.test.ts 가 지키고 있으므로 수정하지 않는다.
 * 1학기 내용과 prereq 연결, keywords, strand 검토는 이후 작업에서 채운다.
 */
const grade: Grade = {
  id: ${s(grade.id)},
  school: ${s(grade.school)},
  label: ${s(grade.label)},
  fullLabel: ${s(FULL_LABEL[grade.id])},
  curriculum: ${s(CURRICULUM[grade.id])},
  terms: {
    s1: {
      grade: ${s(grade.id)},
      term: "s1",${bookLine(grade.id, "s1")}
      summary: "",
      focus: [],
      diagnostics: [],
      decision: "",
    },
    s2: {
      grade: ${s(grade.id)},
      term: "s2",${bookLine(grade.id, "s2")}
      summary: ${s(grade.summary)},
      focus: [
${grade.focus.map((item) => `        ${s(item)},`).join("\n")}
      ],
      diagnostics: [
${grade.diagnostics.map(diagnosticLiteral).join("\n")}
      ],
      decision: ${s(grade.decision)},
    },
  },
  units: [
${grade.units.map((unit, index) => unitLiteral(grade.id, unit, index)).join("\n")}
  ],
};

export default grade;
`;

  writeFileSync(path.join(ROOT, "content/grades", `${grade.id}.ts`), file, "utf8");

  // 얼려 두는 것은 "교육 문구"뿐이다. curriculum 같은 메타는 별도 회귀 테스트가 지킨다.
  snapshot[grade.id] = {
    s2Summary: grade.summary,
    s2Focus: grade.focus,
    s2Decision: grade.decision,
    s2Diagnostics: grade.diagnostics,
    s2Units: grade.units.map((unit, index) => ({
      id: `${grade.id}-s2-${String(index + 1).padStart(2, "0")}`,
      title: unit.title,
      goal: unit.goal,
      sameText: unit.same,
      priorText: unit.prior,
      risk: unit.risk,
      teach: unit.teach,
      gate: unit.gate,
    })),
  };
}

writeFileSync(
  path.join(ROOT, "tests/fixtures/ported-s2-snapshot.json"),
  `${JSON.stringify(snapshot, null, 2)}\n`,
  "utf8",
);

const unitCount = grades.reduce((sum, grade) => sum + grade.units.length, 0);
console.log(`옮긴 학년 ${grades.length}개, 2학기 단원 ${unitCount}개`);
