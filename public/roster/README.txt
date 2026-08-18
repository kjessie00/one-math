이 폴더의 index.html 은 학생 명부 대시보드를 AES-256-GCM 으로 암호화한 것입니다.

· 평문(실명·학교·메모)은 이 파일에 들어 있지 않습니다. 암호를 넣어야 브라우저 안에서 풀립니다.
· 원본과 암호는 저장소에 없습니다. /roster-data/ (gitignore) 에만 있습니다.

암호를 바꾸려면:
    ROSTER_PASSWORD='새암호' node --experimental-strip-types scripts/roster/lock.ts \
      roster-data/dashboard-src.html public/roster/index.html
그다음 커밋·푸시하면 사이트에 반영됩니다.

대시보드 내용을 바꾸려면:
    roster-data/dashboard-src.html 을 고친 뒤 위 명령을 다시 돌립니다.
    (진도 분석 데이터는 roster-data/roster.json 에서 옵니다.)

짧은 암호에 대하여
    암호가 8자 미만이면 PBKDF2 반복을 2천만 회로 올립니다. 여는 데 1~2초 걸리는 대신,
    네 자리 숫자를 전수 대입하는 데 5시간쯤 걸리게 만듭니다.
    시간을 버는 것이지 안전해지는 것은 아닙니다. 링크와 암호를 같은 채널로 보내지 마세요.
