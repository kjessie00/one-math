import type { Metadata } from "next";
import Link from "next/link";

import { grades, stats } from "@/content/index.ts";

export const metadata: Metadata = {
  title: "사용법과 교육과정 근거",
  description:
    "한 수학 지도를 수업에서 쓰는 방법, 2026학년도 교육과정 적용 기준, 출처, 그리고 LLM으로 보충 문제를 만들 때의 안전한 범위를 정리했습니다.",
};

const SOURCES = [
  {
    label: "2022 개정 교육과정 적용 일정",
    href: "https://ncic.re.kr/bbs/eduNotice2022/view/543.do",
    supports: "학년별 적용 연도. 2026학년도에 중3만 2015 개정이 남는 근거입니다.",
  },
  {
    label: "교육부 2015 개정 교육과정 고시",
    href: "https://www.moe.go.kr/boardCnts/viewRenew.do?M=0404&boardID=141&boardSeq=60747&lev=0&opType=N&s=moe&statusYN=C",
    supports: "중3에 적용되는 2015 개정 교육과정의 내용 체계입니다.",
  },
  {
    label: "EBS 공통수학 최소 성취수준 보장 지도 자료",
    href: "https://wdown.ebsi.co.kr/LMS/lmsx/EBS_Min_Achievement_Online_Guide_Common.pdf",
    supports: "고1 공통수학1·공통수학2의 영역 구분과 학기 배열을 대조했습니다.",
  },
];

export default function GuidePage() {
  return (
    <div className="shell page">
      <header>
        <nav className="breadcrumb" aria-label="위치">
          <Link href="/">전체 지도</Link>
        </nav>
        <p className="eyebrow">사용법과 근거</p>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginTop: "0.5rem" }}>
          이 지도는 진도표가 아니라 복구 지도입니다
        </h1>
        <p className="hero__lead" style={{ marginTop: "0.75rem" }}>
          학생이 막혔을 때 문제를 더 주는 대신, 어디서 끊겼는지를 먼저 찾도록 만들었습니다. 학년 {stats.gradeCount}개,
          단원 {stats.unitCount}개, 단원 사이 연결 {stats.linkCount}개가 하나의 자료에서 나옵니다.
        </p>
      </header>

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">수업에서 쓰기</p>
            <h2>진단은 점수를 매기는 자리가 아닙니다</h2>
          </div>
        </div>
        <div className="grid-cards">
          <article className="card">
            <h3>관문은 30초, 미니 진단은 20~30분</h3>
            <p>
              단원마다 관문 한 문제가 있습니다. 학기 단위로는 기초·연결·설명 세 종류의 미니 진단을
              씁니다. 설명 문항은 말이나 그림으로 답하게 하세요.
            </p>
          </article>
          <article className="card">
            <h3>오답은 복구 위치의 신호</h3>
            <p>
              틀린 문항을 공개해 비교하지 않습니다. &ldquo;여기서 끊겼구나&rdquo;라고 자리만 확인하고
              지도가 가리키는 앞 단원으로 돌아갑니다.
            </p>
          </article>
          <article className="card">
            <h3>설명 순서는 늘 같습니다</h3>
            <p>
              구체물·그림 → 학생의 말 → 식·기호. 식부터 보여 주면 수학을 싫어하는 학생일수록 더 빨리
              닫힙니다.
            </p>
          </article>
          <article className="card">
            <h3>주교재는 하나로</h3>
            <p>
              진도와 기준점은 주교재 한 권으로 유지하고, 여러 교재를 겹쳐 푸는 대신 진단이 가리킨 부분만
              보충합니다.
            </p>
          </article>
        </div>
      </section>

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">교육과정 기준</p>
            <h2>2026학년도에 무엇이 적용되나</h2>
          </div>
        </div>
        <div className="unit-rows">
          {grades.map((grade) => (
            <Link key={grade.id} className="unit-row" href={`/grade/${grade.id}`}>
              <span className="unit-row__seq">{grade.label}</span>
              <span>
                <span className="unit-row__title">{grade.fullLabel}</span>
                <br />
                <span className="unit-row__goal">
                  {grade.curriculum}
                  {grade.terms.s1.book
                    ? ` · 1학기 ${grade.terms.s1.book} / 2학기 ${grade.terms.s2.book}`
                    : ""}
                </span>
              </span>
              <span className="unit-row__go" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
        <p className="note" style={{ marginTop: "1rem" }}>
          <b>학기 배열은 실무 기준입니다.</b> 국가 교육과정은 학년군 성취기준 중심이라 &ldquo;몇 학기에 어떤
          단원&rdquo;이 문서에 그대로 적혀 있지 않습니다. 이 지도의 학기 배열은 교과서와 EBS 공개 목차를
          대조해 정리한 것이며, 학교와 출판사에 따라 순서가 달라질 수 있습니다. 단원에 &lsquo;확인&rsquo;
          표시가 붙어 있으면 아직 근거가 확정되지 않은 항목입니다.
        </p>
      </section>

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">보충 문제</p>
            <h2>LLM에 맡길 수 있는 범위와 반드시 사람이 볼 것</h2>
          </div>
          <p>
            LLM은 교재를 대신하는 정답 기계가 아니라, 교사가 정한 범위 안에서 문제를 변형하는 도구로만
            씁니다.
          </p>
        </div>
        <div className="detail-grid">
          <div className="detail-block detail-block--teach">
            <h3>요청할 때 반드시 넣을 것</h3>
            <p>
              돌아갈 단원, 다룰 개념 하나, 사용할 수의 범위, 문장 길이 상한, 금지할 요소(아직 배우지 않은
              기호·개념), 만들 문항 수와 난이도 순서.
            </p>
            <div className="teach-flow" aria-label="보충 문제 흐름">
              <span>진단 오답</span>
              <i aria-hidden="true">→</i>
              <span>돌아갈 단원</span>
              <i aria-hidden="true">→</i>
              <span>쉬운 3문제</span>
              <i aria-hidden="true">→</i>
              <span>변형 2문제</span>
              <i aria-hidden="true">→</i>
              <span>재진단 1문제</span>
            </div>
          </div>
          <div className="detail-block detail-block--risk">
            <h3>사람이 검수할 것</h3>
            <p>
              정답을 역산해 다시 맞는지, 조건이 빠지지 않았는지, 답이 여러 개 나오지 않는지, 문항끼리
              겹치지 않는지, 난이도가 뒤집히지 않았는지, 아직 배우지 않은 개념이 섞이지 않았는지.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">출처</p>
            <h2>무엇을 무엇으로 확인했는가</h2>
          </div>
        </div>
        <div className="unit-rows">
          {SOURCES.map((source) => (
            <a
              key={source.href}
              className="unit-row"
              href={source.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span className="unit-row__seq" aria-hidden="true">
                ↗
              </span>
              <span>
                <span className="unit-row__title">{source.label}</span>
                <br />
                <span className="unit-row__goal">{source.supports}</span>
              </span>
              <span className="unit-row__go sr-only">새 창에서 열기</span>
            </a>
          ))}
        </div>
      </section>

      <section>
        <p className="note">
          <b>지금 없는 것.</b> 학생별 진단 기록 저장, 로그인, 결제, 실시간 문제 생성 API는 이 버전에
          없습니다. 콘텐츠는 누구나 로그인 없이 볼 수 있고, 개인정보를 수집하지 않습니다.
        </p>
      </section>
    </div>
  );
}
