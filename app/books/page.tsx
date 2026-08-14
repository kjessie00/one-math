import type { Metadata } from "next";
import Link from "next/link";

import {
  BOOKS,
  TERM_LABEL,
  bookColumns,
  bookStats,
  coverageOf,
  gradeById,
  unitById,
  volumesOfBook,
  type BookLevel,
  type BookRole,
} from "@/content/index.ts";

export const metadata: Metadata = {
  title: "교재와 단원 연결",
  description:
    "시중 수학 교재의 목차를 이 지도의 단원과 이어 두었습니다. 막힌 단원을 찾은 다음 어느 교재 몇 장을 펴야 하는지 바로 알 수 있습니다.",
};

const LEVELS: BookLevel[] = ["초등", "중등", "고등"];
const ROLES: BookRole[] = ["개념", "유형", "내신", "심화"];

export default function BooksPage() {
  const hasBooks = BOOKS.length > 0;

  return (
    <div className="shell page">
      <header>
        <nav className="breadcrumb" aria-label="위치">
          <Link href="/">전체 지도</Link>
        </nav>
        <p className="eyebrow">교재</p>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginTop: "0.5rem" }}>
          어느 교재 몇 장을 펴야 하는가
        </h1>
        <p className="hero__lead" style={{ marginTop: "0.75rem" }}>
          지도에서 막힌 단원을 찾았다면 그다음은 문제입니다. 시중 교재의 목차를 단원에 이어 두었으니,
          단원 화면에서 바로 해당 장을 확인하세요.
        </p>
        {hasBooks ? (
          <div className="hero__figures">
            <div>
              <b>{bookStats.bookCount}</b>
              <span>교재</span>
            </div>
            <div>
              <b>{bookStats.volumeCount}</b>
              <span>권</span>
            </div>
            <div>
              <b>{bookStats.linkedChapterCount}</b>
              <span>단원에 이어진 장</span>
            </div>
            <div>
              <b>{bookStats.coveredUnitCount}</b>
              <span>교재가 붙은 단원</span>
            </div>
          </div>
        ) : null}
      </header>

      {hasBooks ? (
        <section className="map" style={{ paddingBottom: 0 }}>
          <div className="section-head">
            <div>
              <p className="eyebrow">한눈에</p>
              <h2>어느 교재가 어느 학기를 덮는가</h2>
            </div>
            <p>
              칸의 숫자는 그 권에서 <b>단원에 이어진 장 수 / 전체 장 수</b>입니다. 눌러 보면 그 학기
              첫 단원으로 갑니다.
            </p>
          </div>

          <div className="map__scroll">
            <div className="book-grid" role="grid" aria-label="교재별 학기 덮는 범위">
              <div className="contents" role="row">
                <div className="map__corner" role="columnheader">
                  <span>교재 ＼ 학기</span>
                </div>
                {bookColumns.map(({ grade, term }, index) => (
                  <div
                    key={`${grade.id}-${term}`}
                    role="columnheader"
                    className={`map__gradehead${
                      index > 0 && grade.school !== bookColumns[index - 1].grade.school
                        ? " map__gradehead--school-start"
                        : ""
                    }`}
                  >
                    <b>{grade.label}</b>
                    <small className="mono">{term === "s1" ? "1학기" : "2학기"}</small>
                  </div>
                ))}
              </div>

              {LEVELS.flatMap((level) =>
                ROLES.flatMap((role) =>
                  BOOKS.filter((book) => book.level === level && book.role === role).map((book) => (
                    <div className="contents" role="row" key={book.id}>
                      <div className="map__lane book-grid__lane" role="rowheader">
                        <b>{book.name}</b>
                        <small>
                          {book.publisher} · {book.role}
                        </small>
                      </div>
                      {coverageOf(book.id).map((cell) => {
                        const first = cell.volume?.chapters.find((chapter) => chapter.unitId);
                        const inner = cell.volume ? (
                          <>
                            {cell.linked}/{cell.total}
                          </>
                        ) : null;
                        return (
                          <div
                            key={`${book.id}-${cell.grade.id}-${cell.term}`}
                            role="gridcell"
                            className={`book-cell${cell.volume ? " book-cell--has" : ""}`}
                          >
                            {cell.volume && first?.unitId ? (
                              <Link
                                href={`/unit/${first.unitId}`}
                                title={`${book.name} ${cell.grade.label} ${
                                  cell.term === "s1" ? "1학기" : "2학기"
                                } · ${cell.volume.edition}`}
                              >
                                {inner}
                              </Link>
                            ) : (
                              <span aria-hidden={!cell.volume}>{inner}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )),
                ),
              )}
            </div>
          </div>
        </section>
      ) : null}

      {!hasBooks ? (
        <p className="note">
          <b>아직 준비 중입니다.</b> 교재 목차를 서점·출판사 공개 페이지에서 모으고 있습니다. 확인한
          것만 올라가며, 출처 링크를 함께 답니다.
        </p>
      ) : null}

      {LEVELS.map((level) => {
        const books = BOOKS.filter((book) => book.level === level);
        if (books.length === 0) return null;
        return (
          <section key={level}>
            <div className="section-head">
              <div>
                <p className="eyebrow">{level}</p>
                <h2>{level} 교재</h2>
              </div>
            </div>
            <div className="grid-cards">
              {ROLES.flatMap((role) => books.filter((book) => book.role === role)).map((book) => {
                const volumes = volumesOfBook(book.id);
                return (
                  <article className="card" key={book.id}>
                    <span className="label">{book.role}</span>
                    <h3>{book.name}</h3>
                    <p>
                      {book.publisher} · {book.structure}
                    </p>
                    {book.publisherNote ? (
                      <p>
                        <b style={{ color: "var(--ink-strong)" }}>출판사 설명</b> {book.publisherNote}
                      </p>
                    ) : null}
                    {book.fitFor ? (
                      <p>
                        <b style={{ color: "var(--ink-strong)" }}>이럴 때</b> {book.fitFor}
                      </p>
                    ) : null}
                    <p className="label" style={{ marginTop: "0.5rem" }}>
                      확보한 권
                    </p>
                    <div className="ladder__items">
                      {volumes.map((volume) => {
                        const grade = gradeById.get(volume.grade);
                        const label = grade?.terms[volume.term].book ?? TERM_LABEL[volume.term];
                        const linked = volume.chapters.filter((chapter) => chapter.unitId);
                        const first = linked[0]?.unitId ? unitById.get(linked[0].unitId) : undefined;
                        return (
                          <Link
                            key={`${volume.grade}-${volume.term}`}
                            className="unit-ref"
                            href={first ? `/unit/${first.id}` : "/"}
                            title={`${volume.chapters.length}개 장 중 ${linked.length}개가 단원에 이어짐`}
                          >
                            <small className="mono">
                              {grade?.label} {label}
                            </small>
                            {linked.length}/{volume.chapters.length}장
                          </Link>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      {hasBooks ? (
        <section>
          <div className="section-head">
            <div>
              <p className="eyebrow">읽는 법</p>
              <h2>이 목록을 그대로 믿지 마세요</h2>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-block">
              <h3>목차는 긁은 그대로입니다</h3>
              <p>
                서점·출판사 공개 페이지에서 가져온 목차를 다듬지 않고 그대로 씁니다. 각 권의 출처
                링크를 눌러 직접 확인할 수 있습니다. 판(년도)이 바뀌면 목차도 바뀝니다.
              </p>
            </div>
            <div className="detail-block">
              <h3>특징은 출판사가 한 말입니다</h3>
              <p>
                구성과 특징은 <b>출판사가 스스로 밝힌 설명</b>만 옮겼습니다. 어느 교재가 더 좋다는
                평가는 넣지 않았습니다. 학생에게 맞는지는 결국 앞의 진단이 알려 줍니다.
              </p>
            </div>
            <div className="detail-block">
              <h3>억지로 잇지 않았습니다</h3>
              <p>
                교재의 장 이름이 지도의 단원 이름과 맞을 때 잇습니다. 이름이 다르면 그 단원에 적어 둔
                핵심어와 견주고, 그래도 아니면 교재의 대단원 이름과 견줍니다. 고등은 지도의 단원
                하나가 교재의 대단원 하나여서 이 마지막 단계가 필요합니다. 셋 다 아니면 잇지 않고
                비워 둡니다. 위의 &ldquo;{"n/m"}장&rdquo; 표기가 그 비율입니다.
              </p>
            </div>
          </div>
          <p className="note" style={{ marginTop: "1rem" }}>
            <b>고르는 순서.</b> 개념 → 유형 → 내신 → 심화 순으로 표시했습니다. 진단에서 막힌 단원이
            나왔다면 심화부터 펴지 말고, 그 단원의 개념 교재로 돌아가는 편이 빠릅니다.{" "}
            <Link href="/guide">진단과 판정 기준 보기</Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
