/**
 * 학생 개인정보가 공개 배포에 섞여 들어가는 것을 막는다.
 *
 * 이 저장소는 정적 공개 배포다. 예전에 학생 명부 미리보기 HTML이 실수로 커밋돼
 * 공개된 적이 있다. 사람이 조심하는 것만으로는 같은 일이 또 난다.
 *
 * 그래서 **배포 경로에 들어가는 파일은 암호화된 것이거나, 개인정보 흔적이 없어야 한다.**
 */
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PUBLIC = join(ROOT, "public");

/** 배포되는 파일을 전부 모은다. */
function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

test("공개 배포 폴더에 학생 실명이 평문으로 들어가지 않는다", () => {
  const rosterPath = join(ROOT, "roster-data", "roster.json");
  if (!existsSync(rosterPath)) return; // 명부가 없는 환경(CI)에서는 건너뛴다

  const roster = JSON.parse(readFileSync(rosterPath, "utf8")) as {
    students: { name: string; school?: string; notes?: string[] }[];
  };
  const secrets = [
    ...roster.students.map((s) => s.name),
    ...roster.students.map((s) => s.school ?? "").filter((s) => s.length >= 3),
    ...roster.students.flatMap((s) => s.notes ?? []).filter((n) => n.length >= 12),
  ].filter(Boolean);

  for (const file of walk(PUBLIC)) {
    const text = readFileSync(file, "utf8");
    for (const secret of secrets) {
      assert.ok(
        !text.includes(secret),
        `${file}에 학생 개인정보가 평문으로 들어 있습니다: "${secret.slice(0, 12)}…"\n` +
          `공개 배포에 나갑니다. 암호화한 파일만 public/에 두세요.`,
      );
    }
  }
});

test("public/roster 는 암호화된 파일만 둔다", () => {
  const dir = join(PUBLIC, "roster");
  if (!existsSync(dir)) return;

  const index = join(dir, "index.html");
  assert.ok(existsSync(index), "public/roster/index.html 이 없습니다.");
  const html = readFileSync(index, "utf8");

  // 잠금 페이지의 표식: 암호를 받아 브라우저에서 복호화한다.
  assert.match(html, /PBKDF2/, "암호화된 잠금 페이지가 아닙니다.");
  assert.match(html, /AES-GCM/, "암호화된 잠금 페이지가 아닙니다.");
  assert.match(html, /noindex/, "검색 수집 차단 메타가 없습니다.");
  // 평문 대시보드의 표식이 남아 있으면 안 된다.
  assert.ok(!html.includes('id="orig"'), "학생 데이터가 평문으로 남아 있습니다.");
  assert.ok(!html.includes("인수인계 원문"), "대시보드 본문이 평문으로 남아 있습니다.");
});
