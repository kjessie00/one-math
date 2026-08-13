"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

import { strandStyle } from "./strand-style";

export type MapUnit = {
  id: string;
  title: string;
  grade: string;
  term: "s1" | "s2";
  seq: number;
  strand: string;
  goal: string;
  location: string;
  /** 선수개념 단원 ID만 넘긴다. 이유 문장은 단원 상세에서 읽는다. */
  prereq: string[];
  /** 근거를 아직 확정하지 못한 단원에만 붙는다. 지도에서 '확인' 표시로 나간다. */
  needsCheck?: string;
};

export type MapGrade = {
  id: string;
  label: string;
  school: string;
  curriculum: string;
};

export type MapStrand = {
  id: string;
  name: string;
  short: string;
};

type Props = {
  strands: MapStrand[];
  grades: MapGrade[];
  units: MapUnit[];
};

const TERM_MARK: Record<"s1" | "s2", string> = { s1: "1학기", s2: "2학기" };

/**
 * 선택 상태는 주소(#단원ID)에 둔다.
 * 새로고침하거나 링크를 보내도 같은 자리가 열린다.
 */
const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readHash = () => window.location.hash.replace("#", "");
const noHashOnServer = () => "";

/**
 * 전체 흐름 지도.
 *
 * 가로는 초1에서 고1까지의 시간, 세로는 다섯 갈래의 내용 영역이다.
 * 각 줄은 학년을 가로지르는 레일 하나로 그려서, 칸이 비어도 줄기가 끊겨 보이지 않게 했다.
 * 단원을 고르면 그 단원까지 이어지는 길만 남고 나머지는 물러난다.
 */
export default function FlowMap({ strands, grades, units }: Props) {
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());

  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );

  const hash = useSyncExternalStore(subscribeToHash, readHash, noHashOnServer);
  const selected = hash && unitById.has(hash) ? hash : null;

  /** 앞으로 이어지는 방향. prereq의 반대. */
  const forward = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const unit of units) {
      for (const id of unit.prereq) {
        const list = map.get(id);
        if (list) list.push(unit.id);
        else map.set(id, [unit.id]);
      }
    }
    return map;
  }, [units]);

  /** 행렬 구조. 행은 영역, 열은 학년. */
  const rows = useMemo(
    () =>
      strands.map((strand) => ({
        strand,
        cells: grades.map((grade) => ({
          grade,
          units: units.filter((unit) => unit.strand === strand.id && unit.grade === grade.id),
        })),
      })),
    [strands, grades, units],
  );

  /** 화살표 이동용 평면 목록 (행 → 열 → 단원 순서) */
  const navRows = useMemo(
    () => rows.map((row) => row.cells.flatMap((cell) => cell.units.map((unit) => unit.id))),
    [rows],
  );

  const ancestors = useMemo(() => {
    if (!selected) return new Set<string>();
    const found = new Set<string>();
    const queue = [selected];
    while (queue.length) {
      const current = queue.shift() as string;
      for (const id of unitById.get(current)?.prereq ?? []) {
        if (found.has(id)) continue;
        found.add(id);
        queue.push(id);
      }
    }
    return found;
  }, [selected, unitById]);

  const descendants = useMemo(() => {
    if (!selected) return new Set<string>();
    const found = new Set<string>();
    const queue = [selected];
    while (queue.length) {
      const current = queue.shift() as string;
      for (const next of forward.get(current) ?? []) {
        if (found.has(next)) continue;
        found.add(next);
        queue.push(next);
      }
    }
    return found;
  }, [selected, forward]);

  /** 선택한 단원에서 한 단계씩 거슬러 올라가는 사다리 */
  const ladder = useMemo(() => {
    if (!selected) return [];
    const seen = new Set<string>([selected]);
    const levels: MapUnit[][] = [];
    let frontier = [selected];
    for (let depth = 0; depth < 3; depth += 1) {
      const next: MapUnit[] = [];
      for (const current of frontier) {
        for (const id of unitById.get(current)?.prereq ?? []) {
          if (seen.has(id)) continue;
          seen.add(id);
          const unit = unitById.get(id);
          if (unit) next.push(unit);
        }
      }
      if (!next.length) break;
      levels.push(next);
      frontier = next.map((unit) => unit.id);
    }
    return levels;
  }, [selected, unitById]);

  const opensUp = useMemo(() => {
    if (!selected) return [];
    return (forward.get(selected) ?? [])
      .map((id) => unitById.get(id))
      .filter((unit): unit is MapUnit => Boolean(unit));
  }, [selected, forward, unitById]);

  const select = useCallback((id: string | null) => {
    const url = new URL(window.location.href);
    url.hash = id ?? "";
    window.history.replaceState(null, "", id ? url.toString() : url.pathname + url.search);
    // replaceState 는 hashchange 를 일으키지 않으므로 직접 알린다.
    window.dispatchEvent(new Event("hashchange"));
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, rowIndex: number, id: string) => {
      const row = navRows[rowIndex];
      const at = row.indexOf(id);
      let target: string | undefined;

      if (event.key === "ArrowRight") target = row[at + 1];
      else if (event.key === "ArrowLeft") target = row[at - 1];
      else if (event.key === "Home") target = row[0];
      else if (event.key === "End") target = row[row.length - 1];
      else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const step = event.key === "ArrowDown" ? 1 : -1;
        for (let next = rowIndex + step; next >= 0 && next < navRows.length; next += step) {
          if (navRows[next].length) {
            target = navRows[next][Math.min(at, navRows[next].length - 1)];
            break;
          }
        }
      } else return;

      event.preventDefault();
      if (target) chipRefs.current.get(target)?.focus();
    },
    [navRows],
  );

  const stateOf = (id: string) => {
    if (!selected) return undefined;
    if (id === selected) return "selected";
    if (ancestors.has(id)) return "ancestor";
    if (descendants.has(id)) return "descendant";
    return "dim";
  };

  const firstFocusable = navRows.find((row) => row.length)?.[0];
  const current = selected ? unitById.get(selected) : null;

  return (
    <>
      <div className="map__toolbar">
        <p className="map__hint">
          단원을 누르면 그 단원까지 이어지는 길만 남습니다. 화살표 키로도 옮겨 다닐 수 있습니다.
        </p>
        <button
          type="button"
          className="chip-button"
          aria-pressed={selected !== null}
          onClick={() => select(null)}
          disabled={!selected}
        >
          연결 표시 해제
        </button>
      </div>

      <div className="map__scroll">
        <div className="map__grid" role="grid" aria-label="초1부터 고1까지 수학 단원 연결 지도">
          <div className="contents" role="row">
            <div className="map__corner" role="columnheader">
              <span>영역 ＼ 학년</span>
            </div>
            {grades.map((grade, index) => (
              <div
                key={grade.id}
                role="columnheader"
                className={`map__gradehead${
                  index > 0 && grade.school !== grades[index - 1].school
                    ? " map__gradehead--school-start"
                    : ""
                }`}
              >
                <b>{grade.label}</b>
                <small className="mono">{grade.school}</small>
              </div>
            ))}
          </div>

          {rows.map((row, rowIndex) => (
            <div key={row.strand.id} className="contents" role="row">
              <div className="map__lane" role="rowheader" style={strandStyle(row.strand.id as never)}>
                <Link href={`/strand/${row.strand.id}`}>
                  <b>{row.strand.name}</b>
                  <span className="lane-rule" aria-hidden="true" />
                </Link>
              </div>

              {row.cells.map((cell, cellIndex) => (
                <div
                  key={`${row.strand.id}-${cell.grade.id}`}
                  role="gridcell"
                  style={strandStyle(row.strand.id as never)}
                  className={`map__cell${
                    cellIndex > 0 && cell.grade.school !== grades[cellIndex - 1].school
                      ? " map__cell--school-start"
                      : ""
                  }${selected && !cell.units.some((unit) => stateOf(unit.id) !== "dim") ? " map__cell--dim" : ""}`}
                >
                  {cell.units.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      ref={(node) => {
                        if (node) chipRefs.current.set(unit.id, node);
                        else chipRefs.current.delete(unit.id);
                      }}
                      className="unit-chip"
                      data-state={stateOf(unit.id)}
                      aria-pressed={selected === unit.id}
                      tabIndex={selected ? (selected === unit.id ? 0 : -1) : unit.id === firstFocusable ? 0 : -1}
                      onClick={() => select(selected === unit.id ? null : unit.id)}
                      onKeyDown={(event) => onKeyDown(event, rowIndex, unit.id)}
                    >
                      <span className="unit-chip__term mono">{TERM_MARK[unit.term]}</span>
                      <span className="unit-chip__title">{unit.title}</span>
                      {unit.needsCheck ? (
                        <span className="unit-chip__flag" title={unit.needsCheck}>
                          확인
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="map__legend">
        {strands.map((strand) => (
          <span key={strand.id} style={strandStyle(strand.id as never)}>
            <i className="legend-swatch" style={{ color: "var(--lane-color)" }} aria-hidden="true" />
            {strand.name}
          </span>
        ))}
        <span>
          <i className="legend-swatch legend-swatch--dashed" aria-hidden="true" />
          선택한 단원 이후에 열리는 단원
        </span>
      </div>

      {current ? (
        <aside className="trace-panel" aria-live="polite">
          <div className="shell trace-panel__inner">
            <div style={strandStyle(current.strand as never)}>
              <div className="trace-panel__head">
                <div>
                  <p className="eyebrow">{current.location}</p>
                  <h3>{current.title}</h3>
                </div>
                <button type="button" className="trace-panel__close" onClick={() => select(null)}>
                  닫기
                </button>
              </div>
              <p>{current.goal}</p>
              <div className="trace-panel__actions">
                <Link className="button" href={`/unit/${current.id}`}>
                  단원 자세히 보기
                </Link>
                <Link className="button button--quiet" href={`/grade/${current.grade}`}>
                  이 학년 전체
                </Link>
              </div>
            </div>

            <div>
              <p className="label">막혔을 때 돌아갈 순서</p>
              {ladder.length === 0 ? (
                <p className="ladder__empty">
                  이 단원 앞에 놓인 선수개념이 지도에 아직 연결되어 있지 않습니다.
                </p>
              ) : (
                <ol className="ladder">
                  {ladder.slice(0, 2).map((level, index) => (
                    <li key={index}>
                      <span className="ladder__step">
                        {index === 0 ? "바로 앞" : `${index + 1}칸 뒤`}
                      </span>
                      <div className="ladder__items">
                        {level.map((unit) => (
                          <Link
                            key={unit.id}
                            className="unit-ref"
                            href={`/unit/${unit.id}`}
                            style={strandStyle(unit.strand as never)}
                          >
                            <small className="mono">{unit.location}</small>
                            {unit.title}
                          </Link>
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {ladder.length > 2 ? (
                <p className="ladder__more">
                  더 아래까지 이어집니다.{" "}
                  <Link href={`/unit/${current.id}`}>{current.title} 단원에서 전체 경로 보기</Link>
                </p>
              ) : null}

              {opensUp.length > 0 ? (
                <>
                  <p className="label" style={{ marginTop: "1rem" }}>
                    여기를 넘기면 열리는 단원
                  </p>
                  <div className="ladder__items">
                    {opensUp.map((unit) => (
                      <Link
                        key={unit.id}
                        className="unit-ref"
                        href={`/unit/${unit.id}`}
                        style={strandStyle(unit.strand as never)}
                      >
                        <small className="mono">{unit.location}</small>
                        {unit.title}
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}
