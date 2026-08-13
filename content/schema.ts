/**
 * 한 수학 지도(one-math) 콘텐츠 스키마
 *
 * 설계 원칙
 * 1. 모든 교육 콘텐츠는 이 파일의 타입을 따르는 단일 원천(content/grades/*.ts)에서만 나온다.
 * 2. 단원 사이의 연결은 자유 서술이 아니라 단원 ID 참조(`prereq`)로 표현한다.
 *    → 끊어진 연결을 테스트로 잡을 수 있고, 화면에서 흐름을 자동으로 그릴 수 있다.
 * 3. 기존에 검토가 끝난 2학기 콘텐츠는 문구를 바꾸지 않고 그대로 옮긴다.
 */

/** 내용 영역. 초·중은 2022 개정 4개 영역을 따르고, 고1 집합·명제 계열을 위해 `log`를 더한다. */
export type StrandId = "num" | "rel" | "geo" | "dat" | "log";

export type GradeId =
  | "e1"
  | "e2"
  | "e3"
  | "e4"
  | "e5"
  | "e6"
  | "m1"
  | "m2"
  | "m3"
  | "h1";

export type TermId = "s1" | "s2";

export type School = "초등" | "중등" | "고등";

/** 30초 관문 진단: 이 단원을 시작해도 되는지 한 문제로 확인한다. */
export type Gate = {
  question: string;
  answer: string;
  /** 대표 오답과 그 오답이 뜻하는 것 */
  signal: string;
  /** 틀렸을 때 돌아갈 곳 (사람이 읽는 문장) */
  fix: string;
};

/** 학기 단위 미니 진단(20~30분) 문항 */
export type Diagnostic = {
  kind: "기초" | "연결" | "설명";
  question: string;
  answer: string;
  signal: string;
  fix: string;
};

/**
 * 선수개념 연결.
 * `id`는 반드시 실제 존재하는 단원 ID여야 한다(테스트로 강제).
 * `why`는 "왜 이게 먼저 필요한가"를 한 문장으로 설명한다.
 */
export type PrereqLink = {
  id: UnitId;
  why: string;
};

export type UnitId = string;

export type Unit = {
  /** `{gradeId}-{termId}-{2자리 순번}` 예: "e1-s2-01", "h1-s2-03" */
  id: UnitId;
  grade: GradeId;
  term: TermId;
  seq: number;
  strand: StrandId;
  title: string;
  /** 이 단원에서 학생이 할 수 있게 되는 것, 한 문장 */
  goal: string;
  /** 검색과 연결 확인용 핵심어 */
  keywords: string[];
  /** 구조적 연결: 먼저 서 있어야 하는 단원들 */
  prereq: PrereqLink[];
  /** 같은 학년 앞 학기 선수개념 서술(이식 원문 보존용) */
  sameText?: string;
  /** 전 학년 선수개념 서술(이식 원문 보존용) */
  priorText?: string;
  /** 막혔을 때 겉으로 보이는 신호 */
  risk: string;
  /** 구체물·그림 → 학생의 말 → 식·기호 순서의 교수법 */
  teach: string;
  gate: Gate;
  /** ported = 2026-08 검토 완료본에서 문구 그대로 이식, new = 이번에 새로 작성 */
  origin: "ported" | "new";
  /**
   * 교육과정 근거를 **아직 확정하지 못한** 항목에만 사유를 적는다.
   * 조사로 답이 나오면 지운다. 화면에는 '확인' 배지로 나간다.
   */
  needsCheck?: string;
  /**
   * 발행사에 따라 실제로 다른 것이 **확정된** 경우의 안내.
   * 불확실해서가 아니라 사실이 하나가 아니어서 적는 것이므로 needsCheck 와 섞지 않는다.
   * 무엇이 어떻게 다른지 구체적으로 쓴다. (예: 단원명이 '직육면체'와 '직육면체와 정육면체'로 갈린다)
   */
  publisherNote?: string;
};

export type TermPlan = {
  grade: GradeId;
  term: TermId;
  /** 고1처럼 학기별 과목명이 있는 경우 (예: "공통수학1") */
  book?: string;
  /** 이 학기 수학의 핵심 한 문장 */
  summary: string;
  /** 학기를 시작하기 전 최우선 선수개념 3개 */
  focus: string[];
  diagnostics: Diagnostic[];
  /** 바로 진도 / 짧은 보충 / 집중 보충 판정 메모 */
  decision: string;
  /**
   * 이 학기 전체에 걸리는 발행사별 차이. 검정 교과서라 단원 순서가 갈리는 경우가 여기 온다.
   * 단원마다 같은 말을 반복하지 않고 학기에 한 번만 적는다.
   */
  publisherNote?: string;
};

export type Grade = {
  id: GradeId;
  school: School;
  /** 화면에 쓰는 짧은 이름 예: "초1" */
  label: string;
  /** 읽기용 전체 이름 예: "초등학교 1학년" */
  fullLabel: string;
  /** 2026학년도 기준 적용 교육과정 */
  curriculum: string;
  terms: Record<TermId, TermPlan>;
  units: Unit[];
};

export type Strand = {
  id: StrandId;
  /** 교육과정 영역명 */
  name: string;
  /** 좁은 화면·지도 축에서 쓰는 2~3글자 */
  short: string;
  /** 이 축이 초1에서 고1까지 무엇을 키우는지 */
  description: string;
};

/**
 * 이 지도가 먼저 맞춰 둔 지역.
 *
 * 교육과정 자체는 전국이 같지만, 2022 개정부터 초3~초6 수학이 검정 교과서라
 * **단원 순서와 이름은 학교가 채택한 발행사에 따라 다르다.**
 * 그래서 "어느 지역 학교를 기준으로 맞췄는지"를 밝혀 두어야 교사가 자기 교과서와 대조할 수 있다.
 */
export const REGION = {
  name: "전북특별자치도 김제시",
  short: "김제",
  /** 2024년 전라북도에서 이름이 바뀌었다. 옛 이름으로 찾는 사람을 위해 남긴다. */
  formerName: "전라북도 김제시",
  note: "초·중학교와 고등학교 1학년을 기준으로 맞췄습니다.",
} as const;

/** 기준 지역 학교가 실제로 채택한 수학 교과서. 공개 공고에서 확인한 것만 적는다. */
export type RegionTextbook = {
  school: string;
  /** 어느 학년·과목인지 */
  scope: string;
  publisher: string;
  /** 학교 공고에서 확인한 날짜 */
  checked: string;
  source: string;
  note?: string;
};

/**
 * 2026-08-13에 전북교육청 학교 누리집(school.jbedu.kr) 공개 공고를 직접 열어 확인한 것.
 * 학교가 공개한 문서에 적힌 대로만 적는다. 추측으로 채우지 않는다.
 */
export const REGION_TEXTBOOKS: RegionTextbook[] = [
  {
    school: "김제중학교",
    scope: "중1 수학",
    publisher: "동아출판",
    checked: "2026-08-13",
    source: "https://school.jbedu.kr/gimje/M010301/view/6852923",
  },
  {
    school: "김제중학교",
    scope: "중2 수학",
    publisher: "동아출판",
    checked: "2026-08-13",
    source: "https://school.jbedu.kr/gimje/M010301/view/6852923",
    note: "학교 공고 표에는 ‘동아칠판’으로 적혀 있습니다. 같은 표의 다른 과목 표기로 보아 ‘동아출판’의 오타로 보입니다.",
  },
  {
    school: "김제중학교",
    scope: "중3 수학",
    publisher: "교학사",
    checked: "2026-08-13",
    source: "https://school.jbedu.kr/gimje/M010301/view/6852923",
    note: "중3은 2026학년도에 2015 개정 교육과정을 적용합니다.",
  },
  {
    school: "김제고등학교",
    scope: "고1 공통수학1·공통수학2",
    publisher: "㈜천재교과서(전)",
    checked: "2026-08-13",
    source: "https://school.jbedu.kr/gimje-h/M010301/view/6117884",
    note: "선정 목록의 1순위입니다. 2순위 ㈜미래엔(황), 3순위 ㈜비상교육(김).",
  },
];

/** 찾아봤지만 공개 자료로 확인되지 않은 것. 무엇을 어디까지 봤는지 남긴다. */
export const REGION_UNKNOWN =
  "초등학교 수학 발행사는 확인하지 못했습니다. 김제초등학교가 2025년 10월 학교운영위원회에서 2026학년도 5~6학년 검인정 교과용도서 9개 과목(수학·수학익힘 포함) 선정을 원안가결한 것까지는 공개 문서로 확인했지만, 공개된 심의 결과에는 발행사 이름이 적혀 있지 않습니다. 초등 교과서는 학교에 직접 물어보셔야 합니다.";

export const TERM_LABEL: Record<TermId, string> = {
  s1: "1학기",
  s2: "2학기",
};

export const GRADE_ORDER: GradeId[] = [
  "e1",
  "e2",
  "e3",
  "e4",
  "e5",
  "e6",
  "m1",
  "m2",
  "m3",
  "h1",
];

export const STRANDS: Strand[] = [
  {
    id: "num",
    name: "수와 연산",
    short: "수",
    description:
      "묶어 세기에서 자릿값, 분수와 소수, 음수와 무리수, 다항식까지 '수를 다루는 방법'이 넓어지는 축입니다.",
  },
  {
    id: "rel",
    name: "변화와 관계",
    short: "관계",
    description:
      "규칙 찾기에서 비와 비율, 문자와 식, 방정식, 함수와 그래프까지 '두 양이 함께 변하는 방식'을 다루는 축입니다.",
  },
  {
    id: "geo",
    name: "도형과 측정",
    short: "도형",
    description:
      "모양 알아보기에서 길이·넓이·부피, 합동과 닮음, 좌표를 쓴 도형의 방정식까지 '공간을 재고 설명하는 방법'의 축입니다.",
  },
  {
    id: "dat",
    name: "자료와 가능성",
    short: "자료",
    description:
      "분류하기와 표에서 그래프, 평균, 가능성과 확률, 경우의 수까지 '자료를 읽고 불확실한 것을 다루는 방법'의 축입니다.",
  },
  {
    id: "log",
    name: "논리와 집합",
    short: "논리",
    description:
      "같은 것끼리 모으기와 성질 설명하기에서 증명, 집합과 명제까지 '왜 그런지 밝히는 말하기 방식'의 축입니다.",
  },
];

export const STRAND_BY_ID: Record<StrandId, Strand> = Object.fromEntries(
  STRANDS.map((strand) => [strand.id, strand]),
) as Record<StrandId, Strand>;

/** 단원 ID를 만드는 유일한 통로. 형식이 흔들리지 않게 여기서만 조립한다. */
export function makeUnitId(grade: GradeId, term: TermId, seq: number): UnitId {
  return `${grade}-${term}-${String(seq).padStart(2, "0")}`;
}

const UNIT_ID_PATTERN = /^(e[1-6]|m[1-3]|h1)-(s1|s2)-\d{2}$/;

export function isUnitId(value: string): boolean {
  return UNIT_ID_PATTERN.test(value);
}
