/**
 * 학생 한눈에 보기 — 분석 화면 빌드
 *
 *   node --experimental-strip-types scripts/roster/overview.ts
 *
 * 왜 따로 만드나
 *   `app.html`은 한 학생을 골라 **고치는** 도구다. 이 화면은 반대로 60명을 **한 장에 놓고
 *   무엇이 쏠려 있는지 보는** 용도다. 두 가지를 한 화면에 섞으면 둘 다 못 쓴다.
 *
 * 지키는 것
 * 1. **학생 데이터는 /roster-data/ 밖으로 나가지 않는다.** 이 저장소는 정적 공개 배포다.
 *    이 스크립트도 결과물을 /roster-data/ 에만 쓴다.
 * 2. **없는 데이터로 그림을 그리지 않는다.** 관문·평가·수업 기록이 0건이면 그 칸은
 *    "아직 기록 없음"이라고 적는다. 빈 차트를 그리면 없는 것이 있는 것처럼 보인다.
 * 3. 색만으로 뜻을 나르지 않는다. 막대·칸에는 언제나 숫자나 이름표를 함께 단다.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { gradeById, unitById, GRADE_ORDER } from "../../content/index.ts";
import type { Roster, Student } from "./schema.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const DATA_DIR = join(ROOT, "roster-data");
const ROSTER_JSON = join(DATA_DIR, "roster.json");
const OUT = join(DATA_DIR, "overview.html");

if (!existsSync(ROSTER_JSON)) {
  console.error(`명부가 없습니다: ${ROSTER_JSON}`);
  console.error("먼저 scripts/roster/build.ts 로 명부를 만드세요.");
  process.exit(1);
}

const roster = JSON.parse(readFileSync(ROSTER_JSON, "utf8")) as Roster;
const students = roster.students.filter((s) => s.status === "재원");

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 학생 레코드의 grade는 문자열이라 그대로 넘길 수 없다. 모르는 값이면 그대로 보여 준다. */
const gradeLabel = (g: string) => gradeById.get(g as never)?.label ?? g;

/* ── 세는 것들 ──────────────────────────────────────────────────── */

const count = <T,>(list: T[], key: (item: T) => string | undefined) => {
  const map = new Map<string, number>();
  for (const item of list) {
    const k = key(item);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
};

const byGrade = count(students, (s) => s.grade);
const byTag = count(
  students.flatMap((s) => s.tags.map((t) => ({ t }))),
  (x) => x.t,
);
const bySubject = count(
  students.flatMap((s) => s.subjects.map((v) => ({ v }))),
  (x) => x.v,
);

/** 학년별 진도가 걸린 학생 수. 진도는 단원 ID로 걸리므로 학년을 바로 읽을 수 있다. */
const progressByStudent = new Map<string, string[]>();
for (const p of roster.progress) {
  const list = progressByStudent.get(p.studentId) ?? [];
  list.push(p.unitId);
  progressByStudent.set(p.studentId, list);
}

/** 학생이 지금 어느 학년 단원을 하고 있나 vs 그 학생의 학년. 후행·선행을 여기서 읽는다. */
type Placement = { student: Student; unitGrade: string; gap: number; unitIds: string[] };
const placements: Placement[] = [];
for (const s of students) {
  const unitIds = progressByStudent.get(s.id) ?? [];
  if (unitIds.length === 0) continue;
  // 여러 단원이면 가장 뒤(높은 학년)를 그 학생의 현재 위치로 본다.
  const grades = unitIds.map((id) => unitById.get(id as never)?.grade).filter(Boolean) as string[];
  if (grades.length === 0) continue;
  const unitGrade = grades.sort(
    (a, b) => GRADE_ORDER.indexOf(a as never) - GRADE_ORDER.indexOf(b as never),
  )[grades.length - 1];
  const gap = GRADE_ORDER.indexOf(unitGrade as never) - GRADE_ORDER.indexOf(s.grade as never);
  placements.push({ student: s, unitGrade, gap, unitIds });
}

const behind = placements.filter((p) => p.gap < 0).sort((a, b) => a.gap - b.gap);
const ahead = placements.filter((p) => p.gap > 0).sort((a, b) => b.gap - a.gap);
const onTrack = placements.filter((p) => p.gap === 0);
const noProgress = students.filter((s) => !progressByStudent.has(s.id));

/** 교재 쓰임. 같은 책을 여러 학생이 쓰는지, 학생마다 다 다른지가 운영 판단에 걸린다. */
const bookTitles = count(roster.books, (b) => b.title.replace(/\s*\(.*\)\s*$/, "").trim());
const bookRoles = count(roster.books, (b) => b.role ?? "미지정");

/** 태그 중 '먼저 챙길 것'에 해당하는 것. 사람이 붙인 해석이므로 그대로 쓴다. */
const WATCH = ["후행 중", "의욕 저하", "퇴원 의사", "숙제 미흡", "자세한 설명 필요", "연산 보강"];
const watchlist = students
  .filter((s) => s.tags.some((t) => WATCH.includes(t)))
  .map((s) => ({ s, hits: s.tags.filter((t) => WATCH.includes(t)) }))
  .sort((a, b) => b.hits.length - a.hits.length);

/* ── 그리기 ─────────────────────────────────────────────────────── */

/** 가로 막대. 색만으로 뜻을 나르지 않도록 숫자를 언제나 붙인다. */
function bars(rows: [string, number][], opts: { max?: number; tone?: string } = {}) {
  if (rows.length === 0) return `<p class="empty">아직 기록이 없습니다.</p>`;
  const max = opts.max ?? Math.max(...rows.map(([, n]) => n));
  return `<div class="bars">${rows
    .map(
      ([label, n]) => `<div class="bar-row">
      <span class="bar-label">${esc(label)}</span>
      <span class="bar-track"><span class="bar-fill"${
        opts.tone ? ` style="background:${opts.tone}"` : ""
      } style="width:${max ? (n / max) * 100 : 0}%"></span></span>
      <b class="bar-num">${n}</b>
    </div>`,
    )
    .join("")}</div>`;
}

const gradeRows: [string, number][] = GRADE_ORDER.filter((g) => byGrade.has(g)).map((g) => [
  gradeById.get(g)?.label ?? g,
  byGrade.get(g) ?? 0,
]);

const tagRows: [string, number][] = [...byTag.entries()].sort((a, b) => b[1] - a[1]);
const bookRows: [string, number][] = [...bookTitles.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12);

/** 학년 × 진도 위치 표. 대각선에서 벗어난 칸이 후행·선행이다. */
function placementGrid() {
  const gs = GRADE_ORDER.filter((g) => byGrade.has(g));
  const cell = new Map<string, Placement[]>();
  for (const p of placements) {
    const k = `${p.student.grade}|${p.unitGrade}`;
    cell.set(k, [...(cell.get(k) ?? []), p]);
  }
  const head = `<tr><th class="corner">학생 학년 ＼ 지금 하는 단원</th>${gs
    .map((g) => `<th>${esc(gradeById.get(g)?.label ?? g)}</th>`)
    .join("")}</tr>`;
  const body = gs
    .map((sg) => {
      const cells = gs
        .map((ug) => {
          const list = cell.get(`${sg}|${ug}`) ?? [];
          if (list.length === 0) return `<td class="c0"></td>`;
          const gap = GRADE_ORDER.indexOf(ug as never) - GRADE_ORDER.indexOf(sg as never);
          const tone = gap < 0 ? "behind" : gap > 0 ? "ahead" : "same";
          const who = list.map((p) => p.student.name).join(", ");
          return `<td class="c ${tone}" title="${esc(who)}"><b>${list.length}</b><small>${
            gap === 0 ? "제 학년" : gap < 0 ? `${-gap}년 뒤` : `${gap}년 앞`
          }</small></td>`;
        })
        .join("");
      return `<tr><th class="rowhead">${esc(gradeById.get(sg)?.label ?? sg)}</th>${cells}</tr>`;
    })
    .join("");
  return `<div class="table-scroll"><table class="grid">${head}${body}</table></div>`;
}

const fmtUnits = (ids: string[]) =>
  ids
    .map((id) => unitById.get(id as never))
    .filter(Boolean)
    .map((u) => `${gradeById.get(u!.grade)?.label ?? u!.grade} ${u!.title}`)
    .join(" · ");

/* ── 문서 ───────────────────────────────────────────────────────── */

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>학생 한눈에 보기 — ${students.length}명</title>
<style>
  :root{
    --paper:#f6f7f9; --card:#fff; --rule:#d7dce6; --rule-soft:#e8ebf1;
    --ink:#151c2b; --ink-strong:#0b1120; --ink-muted:#5a6479; --ink-faint:#636975;
    --behind:#b45b0d; --behind-soft:#fbeee0;
    --ahead:#1a63c7; --ahead-soft:#e8f0fc;
    --same:#0c7f68; --same-soft:#e2f4ef;
    --warn:#bb2f68; --warn-soft:#fceaf1;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --paper:#10141c; --card:#171d28; --rule:#2b3444; --rule-soft:#212936;
      --ink:#e7ecf5; --ink-strong:#f6f8fb; --ink-muted:#9aa4b8; --ink-faint:#8891a1;
      --behind:#e2913f; --behind-soft:#3a2a17;
      --ahead:#6ea8f5; --ahead-soft:#17233a;
      --same:#4cbfa4; --same-soft:#12302a;
      --warn:#ef7aa6; --warn-soft:#331723;
    }
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);
    font:16px/1.75 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard",system-ui,sans-serif;
    word-break:keep-all;overflow-wrap:break-word;}
  .wrap{max-width:1180px;margin:0 auto;padding:2rem 1.25rem 5rem}
  h1{font-size:clamp(1.6rem,4vw,2.3rem);margin:.25rem 0 .5rem;color:var(--ink-strong);letter-spacing:-.02em}
  h2{font-size:1.15rem;margin:0;color:var(--ink-strong)}
  .sub{color:var(--ink-muted);margin:0 0 1.25rem}
  .privacy{border:1px solid var(--warn);background:var(--warn-soft);border-radius:.6rem;
    padding:.75rem 1rem;margin:0 0 1.5rem;font-size:.9rem}
  .privacy b{color:var(--warn)}
  code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em}

  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.75rem;margin:0 0 2rem}
  .kpi{background:var(--card);border:1px solid var(--rule);border-radius:.7rem;padding:.9rem 1rem}
  .kpi b{display:block;font-size:1.9rem;line-height:1.15;color:var(--ink-strong);letter-spacing:-.02em}
  .kpi span{display:block;font-size:.85rem;color:var(--ink-muted);margin-top:.15rem}
  .kpi small{display:block;font-size:.8rem;color:var(--ink-faint);margin-top:.3rem}

  section{background:var(--card);border:1px solid var(--rule);border-radius:.8rem;
    padding:1.25rem 1.35rem;margin:0 0 1.25rem}
  .head{display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:baseline;margin:0 0 1rem}
  .head p{margin:0;color:var(--ink-muted);font-size:.9rem;flex:1 1 18rem}
  .two{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1.25rem}

  .bars{display:grid;gap:.4rem}
  .bar-row{display:grid;grid-template-columns:minmax(5.5rem,11rem) 1fr 2.5rem;gap:.6rem;align-items:center}
  .bar-label{font-size:.9rem;color:var(--ink-muted);text-align:right;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bar-track{background:var(--rule-soft);border-radius:.25rem;height:1.1rem;overflow:hidden}
  .bar-fill{display:block;height:100%;background:var(--ahead);border-radius:.25rem;min-width:2px}
  .bar-num{font-variant-numeric:tabular-nums;font-size:.9rem;color:var(--ink-strong)}

  .table-scroll{overflow-x:auto}
  table.grid{border-collapse:collapse;font-size:.85rem;min-width:100%}
  table.grid th,table.grid td{border:1px solid var(--rule-soft);padding:.35rem .5rem;text-align:center}
  table.grid .corner{font-weight:500;color:var(--ink-faint);text-align:left;font-size:.8rem;
    white-space:nowrap;background:var(--card);position:sticky;left:0}
  table.grid .rowhead{color:var(--ink-muted);white-space:nowrap;background:var(--card);
    position:sticky;left:0;text-align:right}
  table.grid td.c b{display:block;font-size:1rem;color:var(--ink-strong)}
  table.grid td.c small{display:block;font-size:.7rem;color:var(--ink-faint)}
  td.same{background:var(--same-soft)} td.same b{color:var(--same)}
  td.behind{background:var(--behind-soft)} td.behind b{color:var(--behind)}
  td.ahead{background:var(--ahead-soft)} td.ahead b{color:var(--ahead)}

  ul.people{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}
  ul.people li{border:1px solid var(--rule-soft);border-left:3px solid var(--rule);
    border-radius:.45rem;padding:.55rem .8rem}
  ul.people li.behind{border-left-color:var(--behind)}
  ul.people li.ahead{border-left-color:var(--ahead)}
  ul.people li.watch{border-left-color:var(--warn)}
  .who{font-weight:600;color:var(--ink-strong)}
  .meta{font-size:.85rem;color:var(--ink-muted)}
  .note{font-size:.85rem;color:var(--ink-faint);margin-top:.15rem}
  .chips{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.3rem}
  .chip{font-size:.75rem;padding:.1rem .45rem;border-radius:.7rem;
    background:var(--rule-soft);color:var(--ink-muted)}
  .chip.w{background:var(--warn-soft);color:var(--warn)}
  .empty{color:var(--ink-faint);font-size:.9rem;margin:0}
  .foot{color:var(--ink-faint);font-size:.85rem;margin-top:2rem;border-top:1px solid var(--rule);padding-top:1rem}
  @media print{.privacy{border-color:#000}body{background:#fff}}
</style></head><body>
<div class="wrap">
  <h1>학생 한눈에 보기</h1>
  <p class="sub">재원 ${students.length}명 · 명부 기준일 ${esc(roster.updatedAt)} · 이 파일 생성 ${new Date().toISOString().slice(0, 10)}</p>

  <div class="privacy">
    <b>⚠ 개인정보</b> — 학생 실명과 관찰 기록이 들어 있습니다.
    이 파일은 <code>/roster-data/</code>(gitignore)에만 두세요. 저장소에 커밋하거나
    <code>out/</code>·<code>public/</code>으로 옮기면 공개 사이트에 그대로 실립니다.
  </div>

  <div class="kpis">
    <div class="kpi"><b>${students.length}</b><span>재원 학생</span></div>
    <div class="kpi"><b>${placements.length}</b><span>진도가 걸린 학생</span>
      <small>나머지 ${noProgress.length}명은 아직 단원 미지정</small></div>
    <div class="kpi"><b>${behind.length}</b><span>제 학년보다 뒤</span>
      <small>가장 큰 차이 ${behind.length ? -behind[0].gap : 0}년</small></div>
    <div class="kpi"><b>${watchlist.length}</b><span>먼저 챙길 학생</span>
      <small>후행·의욕·숙제 태그</small></div>
    <div class="kpi"><b>${roster.books.length}</b><span>사용 중인 교재</span>
      <small>${bookTitles.size}종</small></div>
  </div>

  <section>
    <div class="head"><h2>학생이 어디에 몰려 있나</h2>
      <p>학년별 인원입니다. 초6·중1·중2가 가장 두껍습니다.</p></div>
    <div class="two">
      <div>${bars(gradeRows)}</div>
      <div>
        <p class="meta" style="margin:0 0 .5rem">과목</p>
        ${bars([...bySubject.entries()].sort((a, b) => b[1] - a[1]), { tone: "var(--same)" })}
      </div>
    </div>
  </section>

  <section>
    <div class="head"><h2>제 학년에 서 있나</h2>
      <p>가로가 지금 하는 단원의 학년, 세로가 학생의 학년입니다.
        대각선(초록)이 제 학년, 왼쪽 아래(주황)가 후행, 오른쪽 위(파랑)가 선행입니다.
        칸에 마우스를 올리면 이름이 나옵니다.</p></div>
    ${placementGrid()}
    <p class="note" style="margin-top:.75rem">
      진도가 걸린 ${placements.length}명만 나옵니다.
      제 학년 ${onTrack.length}명 · 후행 ${behind.length}명 · 선행 ${ahead.length}명.
      진도는 인수인계 교재 문구에서 자동 추정한 값이라, 명부 도구에서 확정하기 전까지는 참고값입니다.</p>
  </section>

  ${
    behind.length
      ? `<section>
    <div class="head"><h2>제 학년보다 뒤에 있는 학생</h2>
      <p>차이가 큰 순서입니다. 뒤에 있다는 것 자체가 문제는 아니고, 어디서 멈췄는지가 중요합니다.</p></div>
    <ul class="people">${behind
      .map(
        (p) => `<li class="behind">
        <span class="who">${esc(p.student.name)}</span>
        <span class="meta"> · ${esc(gradeLabel(p.student.grade))} · ${esc(p.student.school)}</span>
        <div class="note">지금 ${esc(fmtUnits(p.unitIds))} <b>(${-p.gap}년 뒤)</b></div>
        ${p.student.notes.length ? `<div class="note">${esc(p.student.notes[0])}</div>` : ""}
      </li>`,
      )
      .join("")}</ul>
  </section>`
      : ""
  }

  <section>
    <div class="head"><h2>먼저 챙길 학생</h2>
      <p>사람이 붙인 태그로 모았습니다. 태그가 여러 개 겹친 학생이 위에 옵니다.</p></div>
    <ul class="people">${watchlist
      .map(
        ({ s, hits }) => `<li class="watch">
        <span class="who">${esc(s.name)}</span>
        <span class="meta"> · ${esc(gradeLabel(s.grade))} · ${esc(s.school)}</span>
        <div class="chips">${hits.map((t) => `<span class="chip w">${esc(t)}</span>`).join("")}</div>
        ${s.notes.length ? `<div class="note">${esc(s.notes[0])}</div>` : ""}
      </li>`,
      )
      .join("")}</ul>
  </section>

  <section>
    <div class="head"><h2>어떤 이야기가 자주 나오나</h2>
      <p>태그별 학생 수입니다. 이것은 관찰이 아니라 <b>사람이 붙인 해석</b>이라, 태그를 붙인 기준이 사람마다 다를 수 있습니다.</p></div>
    ${bars(tagRows, { tone: "var(--behind)" })}
  </section>

  <section>
    <div class="head"><h2>교재는 어떻게 쓰이나</h2>
      <p>${roster.books.length}권이 쓰이는데 ${bookTitles.size}종입니다. 대부분 학생마다 다른 책을 쓰고 있습니다.</p></div>
    <div class="two">
      <div>
        <p class="meta" style="margin:0 0 .5rem">많이 쓰는 교재 (상위 12)</p>
        ${bars(bookRows, { tone: "var(--same)" })}
      </div>
      <div>
        <p class="meta" style="margin:0 0 .5rem">쓰임</p>
        ${bars([...bookRoles.entries()].sort((a, b) => b[1] - a[1]))}
      </div>
    </div>
  </section>

  <section>
    <div class="head"><h2>아직 기록이 없는 것</h2>
      <p>빈 차트를 그리지 않고 그대로 적습니다. 여기가 채워지면 이 화면에 칸이 생깁니다.</p></div>
    <ul class="people">
      <li><span class="who">관문 진단</span><div class="note">${roster.gates.length}건 — 단원별 통과 여부를 남기면 못 넘은 단원의 선수개념 사슬을 여기서 보여 줄 수 있습니다.</div></li>
      <li><span class="who">평가 점수</span><div class="note">${roster.assessments.length}건 — 단원평가·학교시험을 남기면 학생별·단원별 점수 추이를 그릴 수 있습니다.</div></li>
      <li><span class="who">수업 기록</span><div class="note">${roster.sessions.length}건 — 날짜별 수업과 숙제 상태를 남기면 출석·숙제 흐름을 볼 수 있습니다.</div></li>
      <li><span class="who">진도 확정</span><div class="note">${roster.progress.filter((p) => p.inferred).length}/${roster.progress.length}건이 교재 문구에서 자동 추정한 값입니다. 명부 도구에서 확인하면 이 화면의 후행 판정이 정확해집니다.</div></li>
    </ul>
  </section>

  <p class="foot">
    이 화면은 <code>scripts/roster/overview.ts</code>가 <code>/roster-data/roster.json</code>을 읽어 만듭니다.
    명부를 고친 뒤 <code>node --experimental-strip-types scripts/roster/overview.ts</code>를 다시 돌리면 갱신됩니다.
    학생을 고치는 것은 <code>roster.html</code>(명부 도구)에서 합니다.
  </p>
</div>
</body></html>`;

writeFileSync(OUT, html, "utf8");
console.log(`만들었습니다: ${OUT}`);
console.log(
  `재원 ${students.length}명 · 진도 ${placements.length}명(후행 ${behind.length}·제학년 ${onTrack.length}·선행 ${ahead.length}) · 먼저 챙길 ${watchlist.length}명`,
);
