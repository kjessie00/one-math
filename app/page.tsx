import Link from "next/link";

import FlowMap, { type MapGrade, type MapStrand, type MapUnit } from "@/components/FlowMap";
import { REGION, STRANDS, allUnits, grades, stats, unitLocation } from "@/content/index.ts";

const mapStrands: MapStrand[] = STRANDS.map(({ id, name, short }) => ({ id, name, short }));

const mapGrades: MapGrade[] = grades.map(({ id, label, school, curriculum }) => ({
  id,
  label,
  school,
  curriculum,
}));

const mapUnits: MapUnit[] = allUnits.map((unit) => ({
  id: unit.id,
  title: unit.title,
  grade: unit.grade,
  term: unit.term,
  seq: unit.seq,
  strand: unit.strand,
  goal: unit.goal,
  location: unitLocation(unit),
  prereq: unit.prereq.map((link) => link.id),
  needsCheck: unit.needsCheck,
}));

const SCHOOLS = ["초등", "중등", "고등"] as const;

export default function Home() {
  return (
    <>
      <section className="shell hero">
        <p className="eyebrow">초1 → 고1 공통수학 · 2026학년도 기준</p>
        <h1>
          수학은 학년마다 새로 시작하지 않습니다.
          <br />
          <em>초1부터 고1까지 한 줄로 이어집니다.</em>
        </h1>
        <p className="hero__lead">
          오늘 막힌 단원은 대부분 몇 학기 전에서 끊긴 자리 때문입니다. 학교 수학 전체를 다섯 갈래로 펼쳐
          두었으니, 막힌 단원을 눌러 거기까지 이어지는 길을 따라가 보세요. 문제를 더 주기 전에 어디로
          돌아가야 하는지가 먼저 보입니다.
        </p>
        <div className="hero__figures">
          <div>
            <b>{stats.gradeCount}</b>
            <span>학년</span>
          </div>
          <div>
            <b>{stats.unitCount}</b>
            <span>단원</span>
          </div>
          <div>
            <b>{stats.linkCount}</b>
            <span>선수개념 연결</span>
          </div>
          <div>
            <b>{stats.strandCount}</b>
            <span>영역</span>
          </div>
        </div>
      </section>

      <section className="shell map" id="map">
        <div className="section-head">
          <div>
            <p className="eyebrow">전체 지도</p>
            <h2>가로는 학년, 세로는 갈래</h2>
          </div>
          <p>
            한 줄이 하나의 갈래입니다. 학년에 그 갈래의 단원이 없어도 줄은 끊기지 않습니다. 잠시 쉬었다가
            다음 학년에서 다시 이어집니다.
          </p>
        </div>
        <FlowMap strands={mapStrands} grades={mapGrades} units={mapUnits} />
      </section>

      <section className="shell">
        <div className="section-head">
          <div>
            <p className="eyebrow">사용법</p>
            <h2>세 걸음이면 됩니다</h2>
          </div>
        </div>
        <div className="grid-cards">
          <article className="card">
            <span className="label">첫째</span>
            <h3>막힌 단원을 지도에서 찾습니다</h3>
            <p>
              학년 탭을 헤맬 필요 없이 위쪽 검색창에 &lsquo;약분&rsquo;, &lsquo;기울기&rsquo;처럼 개념
              이름만 넣어도 됩니다.
            </p>
          </article>
          <article className="card">
            <span className="label">둘째</span>
            <h3>거슬러 올라가는 길을 봅니다</h3>
            <p>
              단원을 누르면 그 단원까지 이어지는 앞 단원만 남습니다. 한 칸 뒤인지, 두세 칸 뒤인지가 바로
              보입니다.
            </p>
          </article>
          <article className="card">
            <span className="label">셋째</span>
            <h3>30초 관문으로 확인합니다</h3>
            <p>
              단원마다 한 문제짜리 관문이 있습니다. 통과하면 진도로, 막히면 카드가 가리키는 자리로
              돌아갑니다.
            </p>
          </article>
        </div>
      </section>

      <section className="shell">
        <div className="section-head">
          <div>
            <p className="eyebrow">학년으로 들어가기</p>
            <h2>한 학년의 두 학기를 한 화면에</h2>
          </div>
          <p>학기별 핵심 한 문장, 시작 전 최우선 선수개념 3개, 단원 목차, 미니 진단이 함께 있습니다.</p>
        </div>
        <div className="grid-cards">
          {SCHOOLS.map((school) => (
            <article className="card" key={school}>
              <span className="label">{school}</span>
              <div className="unit-rows" style={{ marginTop: "0.75rem" }}>
                {grades
                  .filter((grade) => grade.school === school)
                  .map((grade) => (
                    <Link key={grade.id} className="unit-row" href={`/grade/${grade.id}`}>
                      <span className="unit-row__seq">{grade.label}</span>
                      <span>
                        <span className="unit-row__title">{grade.fullLabel}</span>
                        <span className="unit-row__goal"> · {grade.curriculum}</span>
                      </span>
                      <span className="unit-row__go" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="shell">
        <p className="note">
          <b>2026학년도 기준.</b> 초1~초6·중1·중2·고1은 2022 개정 교육과정, 중3은 2015 개정 교육과정을
          적용합니다. 국가 교육과정은 학년군 성취기준 중심이라 학기별 단원 배열은 교과서·EBS 공개 목차를
          대조한 실무 기준이며, {REGION.name} 학교를 먼저 맞췄습니다. 갈리는 지점에는 어느 교과서가 어떻게
          다른지 적어 두었습니다.{" "}
          <Link href="/guide">근거와 사용법 보기</Link>
        </p>
      </section>
    </>
  );
}
