import type { CSSProperties } from "react";

import type { StrandId } from "@/content/schema.ts";

/**
 * 영역 색을 CSS 변수로 넘긴다.
 * 컴포넌트마다 색을 하드코딩하지 않고 --lane-color 하나만 보게 해서,
 * 알갱이·행·배지·테두리가 언제나 같은 색으로 움직이게 만든다.
 */
export function strandStyle(strand: StrandId): CSSProperties {
  return {
    ["--lane-color" as string]: `var(--strand-${strand})`,
    ["--lane-soft" as string]: `var(--strand-${strand}-soft)`,
  };
}
