# 교재 수집 표

교재를 늘릴 때 손대는 곳은 이 폴더의 표 두 개뿐입니다.

| 파일 | 무엇 |
| --- | --- |
| `volumes.tsv` | 어느 시리즈의 어느 학기가 어느 상품 페이지인지 |
| `series.tsv` | 시리즈의 이름·출판사·급·역할·구성·**출판사가 밝힌 특징** |
| `toc-cache.jsonl` | 이미 긁어 온 목차. 서점을 다시 부르지 않으려고 둡니다 |
| `catalog.json` | 위 둘을 합쳐 만든 중간 결과. 직접 고치지 마세요 |

## 늘리는 순서

```bash
# 1) volumes.tsv 에 줄을 더하고, 새 시리즈면 series.tsv 에도 더한다
# 2) 목차를 긁어 catalog.json 을 만든다 (캐시에 있는 권은 다시 부르지 않는다)
node scripts/collect-books.mjs data/books/volumes.tsv data/books/series.tsv data/books/catalog.json data/books/toc-cache.jsonl

# 3) content/books.ts 를 다시 만든다. 권마다 몇 장이 이어졌는지 보고해 준다
node scripts/build-books.mjs data/books/toc-cache.jsonl data/books/catalog.json

# 4) 확인
npm run verify
```

## 지키는 것

- **주소는 예스24 상품 페이지만.** 교보문고는 봇 차단으로 본문이 오지 않습니다.
- **주소를 넣기 전에 직접 열어 제목·학년·학기를 대조합니다.** 남이 찾아 준 주소를 그대로 믿지 않습니다.
- **특징은 출판사가 스스로 밝힌 설명만.** 커뮤니티의 난이도 비교는 넣지 않습니다.
- 3단계 보고에 `버림`이 뜨면 서점 목차가 그 학기 것이 아니라는 뜻입니다. 주소를 다시 확인하세요.
