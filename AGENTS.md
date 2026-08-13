<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 이 저장소의 규칙

### 콘텐츠
- **근거가 있는 것만 반영한다.** 계산으로 자명하거나(계산을 기록에 적는다), 인용 가능한 출처(고시 원문·교육청 자료·교과서 발행사 공개 목차·EBS 공개 목차)가 있을 때만 고친다. 그 밖의 "이 문장이 더 낫다"는 고치지 말고 `docs/검수-기록.md`에 기록만 한다. AI가 출처 없이 한 말은 근거가 아니다.
- 교육 콘텐츠의 단일 원천은 `content/grades/*.ts` 하나다. 화면·검색·PDF·테스트가 모두 여기서만 읽는다.
- `origin: "ported"` 단원의 title / goal / sameText / priorText / risk / teach / gate 문구는 **바꾸지 않는다.** 2026-08에 사람이 교육과정과 대조해 검토를 끝낸 문장이며 `tests/ported-content.test.ts` 가 지킨다. 이 단원에서 손댈 수 있는 것은 keywords, strand, prereq 뿐이다.
- 단원 사이 연결은 서술이 아니라 단원 ID 참조(`prereq`)로 적는다. 선수개념은 반드시 **앞서 배우는** 단원이어야 한다.
- 콘텐츠를 고쳤으면 `npm run validate` 를 돌린다. 한 학년만 볼 때는 `--grade=e3`.
- 불확실한 것과 원래 여러 가지인 것을 섞지 않는다.
  - `needsCheck`: 근거를 **아직 못 찾았다.** 화면에 '확인'으로 나간다. 조사로 답이 나오면 지운다.
  - `publisherNote`: 발행사마다 다른 것이 **확정됐다.** 화면에 '교과서별'로 나간다. 무엇이 어떻게 다른지 구체적으로 쓴다. 학기 전체에 걸리면 TermPlan 에, 그 단원만이면 Unit 에 단다.
  - 둘 다 추측으로 채우지 않는다. 근거 없이 표시를 지우는 것이 가장 나쁘다.

### 교육과정 사실 (2026학년도)
- 초1~초6·중1·중2·고1은 2022 개정, **중3만 2015 개정**.
- 고1 1학기 = 공통수학1(다항식 / 방정식과 부등식 / 경우의 수·순열과 조합 / 행렬), 2학기 = 공통수학2(도형의 방정식 / 집합과 명제 / 함수와 그래프).
- 순열·조합·행렬을 공통수학2에 넣는 것은 과거에 실제로 났던 오류다. 회귀 테스트가 있다.
- 90분 수업안·3-station 운영안은 사용자가 명시적으로 제외했다. 다시 넣지 않는다.

### 화면
- 읽기 편의가 먼저다. 본문 16px, 한국어 줄간격 1.75, `word-break: keep-all`.
- 색만으로 뜻을 나르지 않는다. 영역은 언제나 이름표를 함께 단다.
- 페이지 자체는 가로로 스크롤되지 않는다. 넓은 표는 자기 컨테이너 안에서만 스크롤한다.
- 정적 내보내기(`output: "export"`)다. 서버 전용 기능을 쓰지 않는다.
