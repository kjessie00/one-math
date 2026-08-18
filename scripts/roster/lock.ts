/**
 * 학생 대시보드를 암호로 잠가 정적 사이트에 올릴 수 있게 만든다.
 *
 *   ROSTER_PASSWORD='암호' node --experimental-strip-types scripts/roster/lock.ts <입력.html> <출력.html>
 *
 * 왜 이렇게 하나
 *   GitHub Pages 같은 정적 호스팅에는 서버가 없어서 로그인을 만들 수 없다.
 *   "암호를 물어보고 맞으면 보여 주는" 자바스크립트는 **잠금이 아니다.** 본문이 이미
 *   내려간 뒤라 소스 보기나 개발자 도구로 그냥 읽힌다.
 *
 *   그래서 본문 자체를 AES-256-GCM으로 **암호화해서 내보낸다.** 암호를 넣어야 열쇠가 만들어지고,
 *   그때 비로소 브라우저 안에서 복호화된다. 암호를 모르면 내려받아도 알아볼 수 없는 바이트뿐이다.
 *
 * 남는 한계 (알고 쓰는 것)
 *   · 암호를 아는 사람이 페이지를 열면 그 순간 브라우저 안에는 평문이 있다. 당연한 일이다.
 *   · 암호가 새면 그때부터는 누구나 열 수 있다. 암호는 따로 안전하게 전달한다.
 *   · 무차별 대입을 늦추려고 PBKDF2 반복을 60만 회로 둔다(브라우저에서 1초 안팎).
 */

import { readFileSync, writeFileSync } from "node:fs";

const [inPath, outPath] = process.argv.slice(2);
const password = process.env.ROSTER_PASSWORD;

if (!inPath || !outPath) {
  console.error("쓰는 법: ROSTER_PASSWORD='암호' node --experimental-strip-types scripts/roster/lock.ts <입력.html> <출력.html>");
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error("ROSTER_PASSWORD 환경변수에 8자 이상의 암호를 주세요.");
  console.error("예: ROSTER_PASSWORD='...' node --experimental-strip-types scripts/roster/lock.ts a.html b.html");
  process.exit(1);
}

const ITERATIONS = 600_000;
const plain = readFileSync(inPath, "utf8");

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));

const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
  "deriveKey",
]);
const aesKey = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
  baseKey,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"],
);
const cipher = new Uint8Array(
  await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, enc.encode(plain)),
);

const b64 = (u8: Uint8Array) => Buffer.from(u8).toString("base64");

const page = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
<title>학생 명부 — 암호 필요</title>
<style>
  :root{--paper:#f6f7f9;--card:#fff;--rule:#d7dce6;--ink:#151c2b;--ink-strong:#0b1120;
    --ink-muted:#5a6479;--ink-faint:#636975;--focus:#0b5fff;--warn:#bb2f68;--warn-soft:#fceaf1}
  @media (prefers-color-scheme:dark){:root{--paper:#10141c;--card:#171d28;--rule:#2b3444;
    --ink:#e7ecf5;--ink-strong:#f6f8fb;--ink-muted:#9aa4b8;--ink-faint:#8891a1;
    --focus:#6ea8f5;--warn:#ef7aa6;--warn-soft:#331723}}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--paper);
    color:var(--ink);padding:1.5rem;word-break:keep-all;
    font:16px/1.75 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",Pretendard,system-ui,sans-serif}
  .box{background:var(--card);border:1px solid var(--rule);border-radius:.9rem;
    padding:1.75rem;max-width:26rem;width:100%}
  h1{font-size:1.25rem;margin:0 0 .4rem;color:var(--ink-strong)}
  p{margin:0 0 1.1rem;color:var(--ink-muted);font-size:.92rem}
  label{display:block;font-size:.85rem;color:var(--ink-muted);margin-bottom:.35rem}
  input{width:100%;padding:.65rem .8rem;font-size:1rem;border:1px solid var(--rule);
    border-radius:.5rem;background:var(--paper);color:var(--ink);min-height:44px}
  input:focus-visible{outline:2px solid var(--focus);outline-offset:1px}
  button{margin-top:.8rem;width:100%;padding:.7rem;font-size:1rem;font-weight:600;
    border:0;border-radius:.5rem;background:var(--ink-strong);color:var(--paper);
    cursor:pointer;min-height:44px}
  button:disabled{opacity:.6;cursor:progress}
  button:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
  .msg{margin-top:.8rem;font-size:.88rem;min-height:1.4em}
  .msg.bad{color:var(--warn)}
  .note{margin-top:1.1rem;padding-top:.9rem;border-top:1px solid var(--rule);
    font-size:.82rem;color:var(--ink-faint)}
</style></head><body>
<div class="box">
  <h1>학생 명부</h1>
  <p>학생 개인정보가 들어 있어 암호로 잠가 두었습니다. 암호를 넣으면 이 브라우저 안에서만 풀립니다.</p>
  <form id="f">
    <label for="pw">암호</label>
    <input id="pw" type="password" autocomplete="current-password" autofocus>
    <button id="go" type="submit">열기</button>
  </form>
  <p class="msg" id="msg" role="status" aria-live="polite"></p>
  <p class="note">암호는 서버로 보내지 않습니다. 본문이 암호화된 채로 내려와 브라우저에서 복호화됩니다.
    암호를 모르면 이 파일을 내려받아도 내용을 읽을 수 없습니다.</p>
</div>
<script>
const SALT="${b64(salt)}", IV="${b64(iv)}", DATA="${b64(cipher)}", ITER=${ITERATIONS};
const b=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const f=document.getElementById('f'), pw=document.getElementById('pw'),
      go=document.getElementById('go'), msg=document.getElementById('msg');
f.addEventListener('submit', async e=>{
  e.preventDefault();
  if(!pw.value){pw.focus();return}
  go.disabled=true; msg.className='msg'; msg.textContent='여는 중…';
  try{
    const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw.value),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b(SALT),iterations:ITER,hash:'SHA-256'},
      k,{name:'AES-GCM',length:256},false,['decrypt']);
    const out=await crypto.subtle.decrypt({name:'AES-GCM',iv:b(IV)},key,b(DATA));
    document.open(); document.write(new TextDecoder().decode(out)); document.close();
  }catch(err){
    msg.className='msg bad'; msg.textContent='암호가 맞지 않습니다.';
    go.disabled=false; pw.select();
  }
});
</script>
</body></html>`;

writeFileSync(outPath, page, "utf8");
const kb = (n: number) => `${Math.round(n / 1024)}KB`;
console.log(`잠갔습니다: ${outPath}`);
console.log(`본문 ${kb(plain.length)} → 암호화 ${kb(cipher.length)} · PBKDF2 ${ITERATIONS.toLocaleString()}회`);
console.log("이 파일에는 평문이 없습니다. 암호를 모르면 열 수 없습니다.");
