/**
 * 색 대비가 다시 낮아지지 않게 지킨다.
 *
 * 이 지도는 10~12px 라벨(학기 표시, 학년 표시, 영역 이름표)에 --ink-faint 를 쓴다.
 * 실제 사이트에서 재 보니 라이트 3.08:1, 다크 3.90:1로 WCAG AA(4.5:1)에 못 미쳤다.
 * 값을 되돌리면 여기서 실패한다.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const css = readFileSync(path.join(import.meta.dirname, "../app/globals.css"), "utf8");

function hex(value: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(hex(a)), luminance(hex(b))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** :root 또는 다크 블록에서 토큰 값을 읽는다. */
function token(name: string, dark = false): string {
  const scope = dark ? css.slice(css.indexOf("prefers-color-scheme: dark")) : css;
  const found = scope.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  assert.ok(found, `--${name} 토큰을 찾지 못했습니다.`);
  return found[1];
}

const AA = 4.5;

test("작은 글자 색(--ink-faint)이 라이트 모드 모든 배경에서 AA를 넘는다", () => {
  const fg = token("ink-faint");
  for (const bg of ["paper", "paper-raised", "rule-soft"]) {
    const value = token(bg);
    const ratio = contrast(fg, value);
    assert.ok(ratio >= AA, `--ink-faint ${fg} / --${bg} ${value} = ${ratio.toFixed(2)}:1`);
  }
});

test("작은 글자 색(--ink-faint)이 다크 모드 모든 배경에서 AA를 넘는다", () => {
  const fg = token("ink-faint", true);
  for (const bg of ["paper", "paper-raised", "rule-soft"]) {
    const value = token(bg, true);
    const ratio = contrast(fg, value);
    assert.ok(ratio >= AA, `--ink-faint ${fg} / --${bg} ${value} = ${ratio.toFixed(2)}:1`);
  }
});

test("본문 색이 두 테마 모두에서 AA를 넉넉히 넘는다", () => {
  for (const dark of [false, true]) {
    const ratio = contrast(token("ink", dark), token("paper", dark));
    assert.ok(ratio >= 7, `본문 대비 ${ratio.toFixed(2)}:1 (${dark ? "다크" : "라이트"})`);
  }
});

test("지도 레일이 칸 오른쪽으로 넘치지 않는다", () => {
  // 오른쪽으로 물리면 격자가 컨테이너보다 1px 넓어져 유령 스크롤바가 생긴다.
  assert.match(css, /\.map__cell::before[\s\S]*?inset-inline:\s*-1px 0;/);
});
