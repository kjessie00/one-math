import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { strandStyle } from "@/components/strand-style";
import {
  STRANDS,
  STRAND_BY_ID,
  gradeOf,
  grades,
  unitLocation,
  unitsOfStrand,
  type StrandId,
} from "@/content/index.ts";

type Params = { params: Promise<{ strandId: string }> };

export function generateStaticParams() {
  return STRANDS.map((strand) => ({ strandId: strand.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { strandId } = await params;
  const strand = STRAND_BY_ID[strandId as StrandId];
  if (!strand) return { title: "찾을 수 없는 영역" };
  return { title: `${strand.name} 흐름`, description: strand.description };
}

export default async function StrandPage({ params }: Params) {
  const { strandId } = await params;
  const strand = STRAND_BY_ID[strandId as StrandId];
  if (!strand) notFound();

  const units = unitsOfStrand(strand.id);
  const style = strandStyle(strand.id);

  return (
    <div className="shell page" style={style}>
      <header>
        <nav className="breadcrumb" aria-label="위치">
          <Link href="/">전체 지도</Link>
          <span aria-hidden="true">/</span>
          <span>영역</span>
        </nav>
        <p className="eyebrow strand-badge" style={style}>
          {strand.name}
        </p>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginTop: "0.5rem" }}>
          초1에서 고1까지 이 갈래가 자라는 순서
        </h1>
        <p className="hero__lead" style={{ marginTop: "0.75rem" }}>{strand.description}</p>
      </header>

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">단원 {units.length}개</p>
            <h2>배우는 순서 그대로</h2>
          </div>
          <p>
            학년이 바뀌어도 같은 갈래는 이어집니다. 중간에 비는 학년은 이 갈래를 쉬어 가는 구간입니다.
          </p>
        </div>

        <div className="unit-rows">
          {units.map((unit, index) => {
            const previous = units[index - 1];
            const newGrade = !previous || previous.grade !== unit.grade;
            return (
              <div key={unit.id}>
                {newGrade ? (
                  <p className="label" style={{ marginTop: index === 0 ? 0 : "1rem", display: "block" }}>
                    {gradeOf(unit).fullLabel}
                  </p>
                ) : null}
                <Link className="unit-row" href={`/unit/${unit.id}`} style={style}>
                  <span className="unit-row__seq">{unitLocation(unit).split(" · ")[1]}</span>
                  <span>
                    <span className="unit-row__title">{unit.title}</span>
                    <br />
                    <span className="unit-row__goal">{unit.goal}</span>
                  </span>
                  <span className="unit-row__go" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">다른 갈래</p>
            <h2>학교 수학의 다섯 갈래</h2>
          </div>
        </div>
        <div className="grid-cards">
          {STRANDS.filter((item) => item.id !== strand.id).map((item) => (
            <Link className="card" key={item.id} href={`/strand/${item.id}`} style={strandStyle(item.id)}>
              <span className="strand-badge" style={strandStyle(item.id)}>
                {item.name}
              </span>
              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <p className="note">
          <b>학년 화면이 더 편할 때도 있습니다.</b> 한 학년의 두 학기를 통째로 보려면{" "}
          {grades.slice(0, 3).map((grade) => (
            <span key={grade.id}>
              <Link href={`/grade/${grade.id}`}>{grade.label}</Link>{" "}
            </span>
          ))}
          처럼 학년으로 들어가세요.
        </p>
      </section>
    </div>
  );
}
