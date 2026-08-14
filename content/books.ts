/**
 * 시중 수학 교재와 이 지도의 단원을 잇는 자료.
 *
 * 왜 필요한가
 *   교사는 "이 단원이 막혔다"까지 알아내도, 그다음에 "그럼 어느 교재 몇 단원을 펴야 하나"에서 다시 막힌다.
 *   여기서 단원 ID와 교재 목차를 이어 두면 그 한 걸음이 사라진다.
 *
 * 지키는 규칙
 * 1. **목차는 실제로 긁은 그대로 적는다.** 요약하거나 다듬지 않는다. 출처 URL을 반드시 남긴다.
 * 2. 단원 연결(`unitId`)은 제목이 맞아떨어질 때만 건다. 억지로 맞추지 않는다.
 *    맞는 단원이 없으면 `null`로 두고 "이 교재에만 있는 장"으로 보여 준다.
 * 3. 교재의 구성·특징은 **출판사가 스스로 밝힌 설명**만 쓴다. 커뮤니티 후기는 쓰지 않는다.
 *    (`docs/검수-기록.md`의 근거 기준을 그대로 따른다.)
 */
import type { GradeId, TermId, UnitId } from "./schema.ts";

export type BookLevel = "초등" | "중등" | "고등";

/** 교재가 학습 흐름에서 맡는 자리. 출판사 설명에서 읽어 낸 것만 적는다. */
export type BookRole = "개념" | "유형" | "심화" | "내신";

export type Book = {
  /** 짧은 식별자. 화면 주소에도 쓴다. 예: "ssen-mid" */
  id: string;
  /** 화면에 쓰는 이름. 예: "쎈 중등 수학" */
  name: string;
  publisher: string;
  level: BookLevel;
  role: BookRole;
  /** 출판사가 밝힌 구성. 인용에 가깝게 적는다. */
  structure: string;
  /** 출판사 소개에서 읽은 특징. 없으면 비워 둔다. */
  publisherNote?: string;
  /** 이 교재를 어떤 학생에게 권할 수 있는지. 출판사 설명 범위 안에서만 적는다. */
  fitFor?: string;
};

/** 교재 한 권(학기 단위)의 목차 한 줄. */
export type BookChapter = {
  /** 대단원 표기가 있으면 그대로. 예: "I. 소인수분해" */
  part?: string;
  /** 중단원(장) 제목. 긁은 그대로. */
  title: string;
  /** 이 장이 대응하는 우리 단원. 맞는 것이 없으면 null. */
  unitId: UnitId | null;
};

/** 교재 × 학년 × 학기 한 권. */
export type BookVolume = {
  bookId: string;
  grade: GradeId;
  term: TermId;
  /** 몇 년판인지. 예: "2026년판" */
  edition: string;
  /** 목차를 긁은 상품 페이지 */
  source: string;
  /** 긁은 날짜 */
  checked: string;
  chapters: BookChapter[];
};

export const BOOKS: Book[] = [];

export const BOOK_VOLUMES: BookVolume[] = [];
