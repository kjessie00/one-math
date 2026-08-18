이 폴더의 index.html 은 학생 명부 대시보드를 AES-256-GCM 으로 암호화한 것입니다.

· 평문(실명·학교·메모)은 이 파일에 들어 있지 않습니다. 암호를 넣어야 브라우저 안에서 풀립니다.
· 원본과 암호는 저장소에 없습니다. /roster-data/ (gitignore) 에만 있습니다.
· 다시 만들려면:
    node --experimental-strip-types scripts/roster/overview.ts       # 분석 화면 갱신(선택)
    ROSTER_PASSWORD='암호' node --experimental-strip-types scripts/roster/lock.ts \
      roster-data/dashboard-src.html public/roster/index.html
· 암호를 바꾸려면 위 명령을 새 암호로 다시 돌리고 커밋하면 됩니다.
