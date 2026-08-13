/**
 * 정적으로 내보낸 결과물 검사.
 *
 * 학년·단원 주소를 새로고침하거나 링크로 바로 열었을 때도 열려야 한다는 요구가 있어서,
 * 실제로 단원마다 HTML 파일이 만들어졌는지 확인한다.
 * `npm run build` 를 하지 않았다면 건너뛴다.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { STRANDS, allUnits, grades } from "../content/index.ts";

const OUT = path.join(import.meta.dirname, "..", "out");
const built = existsSync(path.join(OUT, "index.html"));

const page = (...parts: string[]) => path.join(OUT, ...parts, "index.html");

test("모든 단원 주소가 정적 파일로 만들어졌다", { skip: !built && "빌드 결과물 없음" }, () => {
  const missing = allUnits.filter((unit) => !existsSync(page("unit", unit.id)));
  assert.deepEqual(missing.map((unit) => unit.id), [], "빠진 단원 페이지가 있습니다.");
});

test("모든 학년·영역 주소가 정적 파일로 만들어졌다", { skip: !built && "빌드 결과물 없음" }, () => {
  for (const grade of grades) {
    assert.ok(existsSync(page("grade", grade.id)), `${grade.label} 학년 페이지 없음`);
  }
  for (const strand of STRANDS) {
    assert.ok(existsSync(page("strand", strand.id)), `${strand.name} 영역 페이지 없음`);
  }
  assert.ok(existsSync(page("guide")), "안내 페이지 없음");
  assert.ok(existsSync(path.join(OUT, "404.html")), "404 페이지 없음");
});

test("첫 화면 HTML에 지도와 학년이 실제로 들어 있다", { skip: !built && "빌드 결과물 없음" }, () => {
  const html = readFileSync(path.join(OUT, "index.html"), "utf8");
  assert.match(html, /lang="ko"/, "문서 언어가 한국어가 아닙니다.");
  assert.ok(html.includes("한 수학 지도"));
  for (const grade of grades) {
    assert.ok(html.includes(grade.label), `${grade.label}이 첫 화면에 없습니다.`);
  }
  for (const strand of STRANDS) {
    assert.ok(html.includes(strand.name), `${strand.name}이 첫 화면에 없습니다.`);
  }
});

test("단원 페이지에 목표·교수법·관문이 서버에서 이미 그려져 있다", { skip: !built && "빌드 결과물 없음" }, () => {
  const unit = allUnits[allUnits.length - 1];
  const html = readFileSync(page("unit", unit.id), "utf8");
  assert.ok(html.includes(unit.title));
  assert.ok(html.includes("30초 관문"));
  assert.ok(html.includes("구체물·그림"));
});
