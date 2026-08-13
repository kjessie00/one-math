/**
 * 학생 명부(roster) 스키마
 *
 * 설계 원칙
 * 1. **학생 데이터는 이 저장소에 절대 들어오지 않는다.** 이 사이트는 output:"export" 정적 공개
 *    배포라 저장소에 넣는 순간 그대로 공개된다. 실제 데이터는 gitignore된 `/roster-data/`에만 둔다.
 *    이 파일은 "모양"만 정의한다.
 * 2. 연결은 **단방향**이다. content/ (교육과정) → roster (학생). 반대 방향 참조는 없다.
 *    학생 진도는 서술이 아니라 **단원 ID 참조**(`unitId`)로 적는다. content/의 prereq 그래프가
 *    그대로 "이 학생이 어디서 막혔고 어디까지 내려가야 하는가"를 계산해 준다.
 * 3. 관측된 사실(수업·평가·진단)과 사람이 붙인 해석(태그·메모)을 섞지 않는다.
 *    사실은 날짜가 붙은 이벤트 레코드로, 해석은 학생 레코드의 필드로 간다.
 */

import type { UnitId } from "../../content/schema.ts";

export const SCHEMA_VERSION = 1;

export type ISODate = string; // "YYYY-MM-DD"
export type Id = string;

/** 수강 과목. 이 학원은 수학과 국어를 함께 본다. */
export type Subject = "수학" | "국어";

export type StudentStatus = "재원" | "휴원" | "퇴원";

/**
 * 학생 마스터.
 * `origin`이 있으면 2026-08-13 인수인계 원문에서 옮겨 온 레코드라는 뜻이며,
 * 원문 대비 무엇이 바뀌었는지 화면에서 되짚을 수 있다.
 */
export type Student = {
  id: Id;
  name: string;
  /** content/의 GradeId와 같은 값을 쓴다. 학년이 바뀌면 여기만 고친다. */
  grade: string;
  school: string;
  subjects: Subject[];
  status: StudentStatus;
  enrolledAt?: ISODate;
  leftAt?: ISODate;
  /** 사람이 붙인 분류. 화면의 '먼저 챙길 것'이 이걸로 모인다. */
  tags: string[];
  /** 관찰 메모. 한 줄에 하나. */
  notes: string[];
  /** 인수인계 원문 보존용 스냅샷 (있으면 되돌리기 가능) */
  origin?: { at: ISODate; source: string };
};

/** 단원 진도. 학생 × 단원 하나당 한 레코드. */
export type ProgressState = "예정" | "진행" | "완료" | "보류";
export type Progress = {
  id: Id;
  studentId: Id;
  unitId: UnitId;
  state: ProgressState;
  startedAt?: ISODate;
  finishedAt?: ISODate;
  /** 교재 문자열에서 자동 매칭한 값이면 true. 사람이 확인하면 false로 내린다. */
  inferred?: boolean;
  note?: string;
};

/**
 * 관문 진단 결과.
 * 문항은 content/의 `unit.gate`를 그대로 쓴다. 여기에는 결과만 남긴다.
 */
export type GateResult = {
  id: Id;
  studentId: Id;
  unitId: UnitId;
  at: ISODate;
  pass: boolean;
  note?: string;
};

export type AssessmentKind = "단원평가" | "학교시험" | "학력평가" | "기타";
export type Assessment = {
  id: Id;
  studentId: Id;
  at: ISODate;
  kind: AssessmentKind;
  /** 범위. 가능하면 단원 ID로 적고, 어려우면 scopeText에 서술한다. */
  unitIds?: UnitId[];
  scopeText?: string;
  score: number;
  max: number;
  note?: string;
};

export type HomeworkState = "완료" | "일부" | "미제출" | "없음";
export type Session = {
  id: Id;
  studentId: Id;
  at: ISODate;
  content: string;
  homework: HomeworkState;
  note?: string;
};

export type BookStatus = "사용중" | "완료" | "중단";
export type BookUse = {
  id: Id;
  studentId: Id;
  title: string;
  status: BookStatus;
  startedAt?: ISODate;
  finishedAt?: ISODate;
  /** 부교재·숙제용인지 본교재인지 */
  role?: "본교재" | "부교재" | "연산" | "숙제";
};

export type Roster = {
  schemaVersion: number;
  updatedAt: ISODate;
  students: Student[];
  progress: Progress[];
  gates: GateResult[];
  assessments: Assessment[];
  sessions: Session[];
  books: BookUse[];
};

export const EMPTY_ROSTER: Roster = {
  schemaVersion: SCHEMA_VERSION,
  updatedAt: "1970-01-01",
  students: [],
  progress: [],
  gates: [],
  assessments: [],
  sessions: [],
  books: [],
};

/* ------------------------------------------------------------------ */
/* 검증                                                                */
/* ------------------------------------------------------------------ */

export type Issue = { level: "error" | "warn"; where: string; message: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 명부를 검증한다. `knownUnitIds`를 주면 단원 참조가 실재하는지까지 확인한다.
 * content/를 검증하는 scripts/validate-content.ts 와 같은 방식이다.
 */
export function validateRoster(
  roster: Roster,
  knownUnitIds?: ReadonlySet<UnitId>,
): Issue[] {
  const issues: Issue[] = [];
  const err = (where: string, message: string) =>
    issues.push({ level: "error", where, message });
  const warn = (where: string, message: string) =>
    issues.push({ level: "warn", where, message });

  if (roster.schemaVersion !== SCHEMA_VERSION) {
    warn(
      "roster",
      `schemaVersion이 ${roster.schemaVersion}입니다. 이 도구는 ${SCHEMA_VERSION}을 기대합니다.`,
    );
  }

  const studentIds = new Set<Id>();
  for (const s of roster.students) {
    const at = `학생 ${s.name || s.id}`;
    if (!s.id) err(at, "id가 없습니다.");
    if (studentIds.has(s.id)) err(at, `id가 중복됩니다: ${s.id}`);
    studentIds.add(s.id);
    if (!s.name?.trim()) err(at, "이름이 비어 있습니다.");
    if (!s.subjects?.length) warn(at, "수강 과목이 비어 있습니다.");
    if (s.status === "퇴원" && !s.leftAt) warn(at, "퇴원인데 퇴원일이 없습니다.");
    for (const [k, v] of [
      ["enrolledAt", s.enrolledAt],
      ["leftAt", s.leftAt],
    ] as const) {
      if (v && !DATE.test(v)) err(at, `${k} 날짜 형식이 아닙니다: ${v}`);
    }
  }

  const checkChild = (
    rows: { id: Id; studentId: Id }[],
    label: string,
    extra?: (row: never, at: string) => void,
  ) => {
    const seen = new Set<Id>();
    for (const row of rows) {
      const at = `${label} ${row.id}`;
      if (seen.has(row.id)) err(at, `id가 중복됩니다: ${row.id}`);
      seen.add(row.id);
      if (!studentIds.has(row.studentId)) {
        err(at, `없는 학생을 가리킵니다: ${row.studentId}`);
      }
      extra?.(row as never, at);
    }
  };

  const unitCheck = (unitId: UnitId | undefined, at: string) => {
    if (!unitId) return;
    if (knownUnitIds && !knownUnitIds.has(unitId)) {
      err(at, `없는 단원을 가리킵니다: ${unitId}`);
    }
  };
  const dateCheck = (d: string | undefined, at: string, field: string) => {
    if (d && !DATE.test(d)) err(at, `${field} 날짜 형식이 아닙니다: ${d}`);
  };

  checkChild(roster.progress, "진도", (p: Progress, at) => {
    unitCheck(p.unitId, at);
    dateCheck(p.startedAt, at, "startedAt");
    dateCheck(p.finishedAt, at, "finishedAt");
    if (p.state === "완료" && !p.finishedAt) warn(at, "완료인데 완료일이 없습니다.");
    if (p.startedAt && p.finishedAt && p.finishedAt < p.startedAt) {
      err(at, "완료일이 시작일보다 빠릅니다.");
    }
  });

  const pairs = new Set<string>();
  for (const p of roster.progress) {
    const key = `${p.studentId}|${p.unitId}`;
    if (pairs.has(key)) {
      err(`진도 ${p.id}`, `같은 학생·단원 진도가 중복됩니다: ${key}`);
    }
    pairs.add(key);
  }

  checkChild(roster.gates, "관문", (g: GateResult, at) => {
    unitCheck(g.unitId, at);
    dateCheck(g.at, at, "at");
  });

  checkChild(roster.assessments, "평가", (a: Assessment, at) => {
    dateCheck(a.at, at, "at");
    a.unitIds?.forEach((u) => unitCheck(u, at));
    if (!(a.max > 0)) err(at, `만점이 0 이하입니다: ${a.max}`);
    if (a.score < 0 || a.score > a.max) {
      err(at, `점수가 범위를 벗어납니다: ${a.score}/${a.max}`);
    }
  });

  checkChild(roster.sessions, "수업", (s: Session, at) => {
    dateCheck(s.at, at, "at");
    if (!s.content?.trim()) warn(at, "수업 내용이 비어 있습니다.");
  });

  checkChild(roster.books, "교재", (b: BookUse, at) => {
    dateCheck(b.startedAt, at, "startedAt");
    dateCheck(b.finishedAt, at, "finishedAt");
    if (!b.title?.trim()) err(at, "교재명이 비어 있습니다.");
  });

  return issues;
}
