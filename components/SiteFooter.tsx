import Link from "next/link";

import { STRANDS, grades } from "@/content/index.ts";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div>
          <h2>한 수학 지도</h2>
          <p>
            초등학교 1학년부터 고등학교 1학년 공통수학까지, 학교 수학의 뼈대와 단원 사이 연결을 한 장으로
            봅니다. 로그인 없이 누구나 볼 수 있습니다.
          </p>
        </div>

        <div>
          <h2>학년</h2>
          <ul>
            {["초등", "중등", "고등"].map((school) => (
              <li key={school}>
                {school}{" "}
                {grades
                  .filter((grade) => grade.school === school)
                  .map((grade, index) => (
                    <span key={grade.id}>
                      {index > 0 ? " · " : ""}
                      <Link href={`/grade/${grade.id}`}>{grade.label}</Link>
                    </span>
                  ))}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2>영역</h2>
          <ul>
            {STRANDS.map((strand) => (
              <li key={strand.id}>
                <Link href={`/strand/${strand.id}`}>{strand.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2>안내</h2>
          <ul>
            <li>
              <Link href="/guide">사용법 · 교육과정 근거</Link>
            </li>
            <li>2026학년도 기준 · 초1~중2·고1 2022 개정, 중3 2015 개정</li>
            <li>학교와 출판사에 따라 단원 순서가 다를 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
