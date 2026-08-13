import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { strandStyle } from "@/components/strand-style";
import {
  STRAND_BY_ID,
  TERM_LABEL,
  allUnits,
  gradeOf,
  leadsToOf,
  traceBack,
  unitById,
  unitLocation,
} from "@/content/index.ts";

type Params = { params: Promise<{ unitId: string }> };

export function generateStaticParams() {
  return allUnits.map((unit) => ({ unitId: unit.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { unitId } = await params;
  const unit = unitById.get(unitId);
  if (!unit) return { title: "찾을 수 없는 단원" };
  return {
    title: `${unit.title} · ${unitLocation(unit)}`,
    description: unit.goal,
  };
}

export default async function UnitPage({ params }: Params) {
  const { unitId } = await params;
  const unit = unitById.get(unitId);
  if (!unit) notFound();

  const grade = gradeOf(unit);
  const strand = STRAND_BY_ID[unit.strand];
  const termPlan = grade.terms[unit.term];
  const ladder = traceBack(unit.id);
  const opensUp = leadsToOf(unit.id);
  const style = strandStyle(unit.strand);

  return (
    <div className="shell page">
      <header className="unit-head" style={style}>
        <nav className="breadcrumb" aria-label="위치">
          <Link href="/">전체 지도</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/grade/${grade.id}`}>{grade.fullLabel}</Link>
          <span aria-hidden="true">/</span>
          <span>{termPlan.book ?? TERM_LABEL[unit.term]}</span>
          <span aria-hidden="true">/</span>
          <Link href={`/strand/${strand.id}`} className="strand-badge" style={style}>
            {strand.name}
          </Link>
        </nav>
        <p className="eyebrow mono">{unit.id}</p>
        <h1>{unit.title}</h1>
        <p className="unit-head__goal">{unit.goal}</p>
        {unit.publisherNote ? (
          <p className="note note--publisher" style={{ marginTop: "1rem" }}>
            <b>교과서에 따라 다릅니다.</b> {unit.publisherNote}
          </p>
        ) : null}
        {unit.needsCheck ? (
          <p className="note" style={{ marginTop: "1rem" }}>
            <b>확인 필요.</b> {unit.needsCheck}
          </p>
        ) : null}
      </header>

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">돌아갈 자리</p>
            <h2>이 단원 앞에 서 있어야 하는 것</h2>
          </div>
          <p>
            여기가 흔들리면 이 단원 문제를 아무리 더 풀어도 같은 자리에서 막힙니다. 먼저 확인하고
            시작하세요.
          </p>
        </div>

        {unit.prereq.length === 0 ? (
          <p className="ladder__empty">이 단원은 지도에서 출발점에 놓여 있습니다.</p>
        ) : (
          <div className="grid-cards">
            {unit.prereq.map((link) => {
              const source = unitById.get(link.id);
              if (!source) return null;
              const sourceStyle = strandStyle(source.strand);
              return (
                <article className="card" key={link.id} style={sourceStyle}>
                  <span className="label">{unitLocation(source)}</span>
                  <h3>
                    <Link href={`/unit/${source.id}`}>{source.title}</Link>
                  </h3>
                  <p>{link.why}</p>
                </article>
              );
            })}
          </div>
        )}

        {unit.sameText || unit.priorText ? (
          <div className="detail-grid" style={{ marginTop: "1rem" }}>
            {unit.sameText ? (
              <div className="detail-block">
                <h3>같은 학년 앞 학기에서</h3>
                <p>{unit.sameText}</p>
              </div>
            ) : null}
            {unit.priorText ? (
              <div className="detail-block">
                <h3>전 학년에서 끌어오기</h3>
                <p>{unit.priorText}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {ladder.length > 1 ? (
          <div style={{ marginTop: "1.5rem" }}>
            <p className="label">더 내려가야 할 때</p>
            <ol className="ladder">
              {ladder.slice(1).map((level, index) => (
                <li key={index}>
                  <span className="ladder__step">{index + 2}칸 뒤</span>
                  <div className="ladder__items">
                    {level.map((item) => (
                      <Link
                        key={item.id}
                        className="unit-ref"
                        href={`/unit/${item.id}`}
                        style={strandStyle(item.strand)}
                      >
                        <small className="mono">{unitLocation(item)}</small>
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">가르치는 순서</p>
            <h2>쉽게 설명하는 법과 막혔을 때의 신호</h2>
          </div>
        </div>
        <div className="detail-grid">
          <div className="detail-block detail-block--teach">
            <h3>이렇게 시작하세요</h3>
            <p>{unit.teach}</p>
            <div className="teach-flow" aria-label="설명 순서">
              <span>구체물·그림</span>
              <i aria-hidden="true">→</i>
              <span>학생의 말</span>
              <i aria-hidden="true">→</i>
              <span>식·기호</span>
            </div>
          </div>
          <div className="detail-block detail-block--risk">
            <h3>막혔을 때 보이는 신호</h3>
            <p>{unit.risk}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">30초 관문</p>
            <h2>시작해도 되는지 한 문제로 확인</h2>
          </div>
        </div>
        <div className="gate">
          <span className="label">문제</span>
          <p className="gate__question">{unit.gate.question}</p>
          <details className="reveal">
            <summary>정답과 오답 해석 보기</summary>
            <dl className="answer-list">
              <div>
                <dt>정답</dt>
                <dd>{unit.gate.answer}</dd>
              </div>
              <div>
                <dt>대표 오답</dt>
                <dd>{unit.gate.signal}</dd>
              </div>
              <div>
                <dt>돌아갈 곳</dt>
                <dd>{unit.gate.fix}</dd>
              </div>
            </dl>
          </details>
        </div>
      </section>

      {opensUp.length > 0 ? (
        <section>
          <div className="section-head">
            <div>
              <p className="eyebrow">다음으로</p>
              <h2>여기를 넘기면 열리는 단원</h2>
            </div>
          </div>
          <div className="ladder__items">
            {opensUp.map((item) => (
              <Link
                key={item.id}
                className="unit-ref"
                href={`/unit/${item.id}`}
                style={strandStyle(item.strand)}
              >
                <small className="mono">{unitLocation(item)}</small>
                {item.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <p className="note">
          <b>{grade.label} {termPlan.book ?? TERM_LABEL[unit.term]} 전체를 보려면</b>{" "}
          <Link href={`/grade/${grade.id}`}>{grade.fullLabel} 학년 화면</Link>에서 학기 요약과 20~30분 미니
          진단을 확인하세요. 지도에서 이 단원의 자리를 보려면{" "}
          <Link href={`/#${unit.id}`}>전체 지도</Link>로 돌아가면 됩니다.
        </p>
      </section>
    </div>
  );
}
