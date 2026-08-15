import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { strandStyle } from "@/components/strand-style";
import {
  STRAND_BY_ID,
  TERM_LABEL,
  booksForGrade,
  gradeById,
  grades,
  shortReaderNote,
  unitsOfTerm,
  type TermId,
  type TermPlan,
  type Grade,
} from "@/content/index.ts";

type Params = { params: Promise<{ gradeId: string }> };

const TERMS: TermId[] = ["s1", "s2"];

export function generateStaticParams() {
  return grades.map((grade) => ({ gradeId: grade.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { gradeId } = await params;
  const grade = gradeById.get(gradeId as never);
  if (!grade) return { title: "찾을 수 없는 학년" };
  return {
    title: `${grade.fullLabel} 수학 지도`,
    description: `${grade.fullLabel} 1학기와 2학기 단원, 시작 전 선수개념, 미니 진단을 한 화면에서 봅니다.`,
  };
}

function TermBlock({ grade, term, plan }: { grade: Grade; term: TermId; plan: TermPlan }) {
  const units = unitsOfTerm(grade.id, term);
  return (
    <section className="term-block">
      <div className="term-head">
        <h3>{plan.book ?? `${grade.label} ${TERM_LABEL[term]}`}</h3>
        {plan.book ? <span>{TERM_LABEL[term]}</span> : null}
        <span>단원 {units.length}개</span>
      </div>

      <p className="prose">{plan.summary}</p>

      {plan.publisherNote ? (
        <p className="note note--publisher" style={{ marginTop: "1rem" }}>
          <b>교과서에 따라 다릅니다.</b> {plan.publisherNote}
        </p>
      ) : null}

      <div className="detail-grid" style={{ marginTop: "1.25rem" }}>
        <div className="detail-block">
          <h3>시작 전 최우선 3개</h3>
          <ol className="focus-list">
            {plan.focus.map((item, index) => (
              <li key={item}>
                <i className="mono">{index + 1}</i>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="detail-block">
          <h3>판정 메모</h3>
          <p>{plan.decision}</p>
        </div>
      </div>

      <div className="unit-rows" style={{ marginTop: "1.25rem" }}>
        {units.map((unit) => (
          <Link
            key={unit.id}
            className="unit-row"
            href={`/unit/${unit.id}`}
            style={strandStyle(unit.strand)}
          >
            <span className="unit-row__seq">{String(unit.seq).padStart(2, "0")}</span>
            <span>
              <span className="unit-row__title">{unit.title}</span>
              <br />
              <span className="unit-row__goal">{unit.goal}</span>
            </span>
            <span className="unit-row__marks">
              {unit.publisherNote ? <span className="mark mark--publisher">교과서별</span> : null}
              {unit.needsCheck ? <span className="mark mark--check">확인</span> : null}
              <span className="strand-badge" style={strandStyle(unit.strand)}>
                {STRAND_BY_ID[unit.strand].short}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <p className="label">20~30분 미니 진단</p>
        <div className="grid-cards" style={{ marginTop: "0.5rem" }}>
          {plan.diagnostics.map((item, index) => (
            <article className="card" key={`${item.kind}-${index}`}>
              <span className="label">{item.kind}</span>
              <p style={{ color: "var(--ink-strong)", fontWeight: 500 }}>{item.question}</p>
              <details className="reveal">
                <summary>정답과 오답 해석 보기</summary>
                <dl className="answer-list">
                  <div>
                    <dt>정답</dt>
                    <dd>{item.answer}</dd>
                  </div>
                  <div>
                    <dt>오답 신호</dt>
                    <dd>{item.signal}</dd>
                  </div>
                  <div>
                    <dt>보충 시작</dt>
                    <dd>{item.fix}</dd>
                  </div>
                </dl>
              </details>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function GradePage({ params }: Params) {
  const { gradeId } = await params;
  const grade = gradeById.get(gradeId as never);
  if (!grade) notFound();

  const index = grades.findIndex((item) => item.id === grade.id);
  const previous = grades[index - 1];
  const next = grades[index + 1];
  const gradeBooks = booksForGrade(grade.id);

  return (
    <div className="shell page">
      <header>
        <nav className="breadcrumb" aria-label="위치">
          <Link href="/">전체 지도</Link>
          <span aria-hidden="true">/</span>
          <span>{grade.school}</span>
        </nav>
        <p className="eyebrow">{grade.curriculum}</p>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginTop: "0.5rem" }}>
          {grade.fullLabel}
        </h1>
        <p className="hero__lead" style={{ marginTop: "0.75rem" }}>
          두 학기를 한 화면에 놓았습니다. 1학기에서 세운 것이 2학기 어디에 쓰이는지 단원을 눌러 확인하세요.
        </p>
      </header>

      {TERMS.map((term) => (
        <TermBlock key={term} grade={grade} term={term} plan={grade.terms[term]} />
      ))}

      {gradeBooks.length > 0 ? (
        <section>
          <div className="section-head">
            <div>
              <p className="eyebrow">교재</p>
              <h2>이 학년을 덮는 교재</h2>
            </div>
            <p>
              개념 → 유형 → 내신 → 심화 순입니다. <b>쓰는 사람들</b>은 출판사가 아니라 여러 곳에서
              되풀이되는 평이고, 괄호는 그 말을 본 곳의 수입니다.{" "}
              <Link href="/books">교재별 특징 보기</Link>
            </p>
          </div>
          <div className="unit-rows">
            {gradeBooks.map(({ book, terms }) => (
              <Link className="unit-row" key={book.id} href="/books">
                <span className="unit-row__seq">{book.role}</span>
                <span>
                  <span className="unit-row__title">{book.name}</span>{" "}
                  <span className="unit-row__goal">
                    {book.publisher} ·{" "}
                    {terms.map((term) => grade.terms[term].book ?? TERM_LABEL[term]).join(" · ")}
                  </span>
                  {book.readerNote ? (
                    <>
                      <br />
                      <span className="unit-row__readers">
                        <b>쓰는 사람들</b> {shortReaderNote(book.readerNote.says)}{" "}
                        <span className="mono">({book.readerNote.sources}곳)</span>
                      </span>
                    </>
                  ) : null}
                </span>
                <span className="unit-row__go" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">판정</p>
            <h2>점수보다 먼저, 보충의 깊이를 정합니다</h2>
          </div>
        </div>
        <div className="decision-grid">
          <article className="decision-card" style={{ ["--tone" as string]: "var(--go)" }}>
            <h3>바로 진도</h3>
            <b>관문·미니 진단 80% 이상</b>
            <p>설명 문항까지 통과했습니다. 새 단원을 시작하고 1주 뒤 누적 확인만 합니다.</p>
          </article>
          <article className="decision-card" style={{ ["--tone" as string]: "var(--short)" }}>
            <h3>짧은 보충</h3>
            <b>50~79% 또는 한 갈래만 결손</b>
            <p>정확한 선수개념 1~2개만 2~3회 보충한 뒤 같은 구조의 새 문항으로 다시 확인합니다.</p>
          </article>
          <article className="decision-card" style={{ ["--tone" as string]: "var(--deep)" }}>
            <h3>집중 보충</h3>
            <b>50% 미만 또는 설명하지 못함</b>
            <p>현재 학년 문제를 늘리지 않고, 단원이 가리키는 &lsquo;돌아갈 곳&rsquo;부터 구체물과 그림으로 다시 시작합니다.</p>
          </article>
        </div>
      </section>

      <nav className="grid-cards" aria-label="학년 이동">
        {previous ? (
          <Link className="card" href={`/grade/${previous.id}`}>
            <span className="label">앞 학년</span>
            <h3>{previous.fullLabel}</h3>
          </Link>
        ) : null}
        {next ? (
          <Link className="card" href={`/grade/${next.id}`}>
            <span className="label">다음 학년</span>
            <h3>{next.fullLabel}</h3>
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
