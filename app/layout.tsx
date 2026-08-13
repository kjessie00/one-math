import type { Metadata } from "next";
import { Hahmlet, IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

/**
 * 본문. 교재처럼 또박또박 읽히는 고딕.
 * 한글 글꼴은 유니코드 구간별로 200개 가까운 파일로 쪼개져 있어 미리 받으면 첫 화면이 느려진다.
 * preload 를 끄고 실제로 쓰인 글자 구간만 브라우저가 가져가게 둔다.
 */
const body = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-body",
});

/** 제목에만 쓰는 명조. 세로획이 살아 있어 지도 위에서 기준선처럼 보인다. */
const display = Hahmlet({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
  preload: false,
  variable: "--font-display",
});

/** 단원 번호·학년 코드·숫자. 자리를 흔들지 않는 고정폭. */
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "한 수학 지도 — 초1부터 고1까지 이어지는 학교 수학",
    template: "%s · 한 수학 지도",
  },
  description:
    "초등학교 1학년부터 고등학교 1학년 공통수학까지, 학교 수학 전체의 뼈대와 단원 사이 연결을 한 장의 지도로 봅니다. 막힌 단원에서 거슬러 올라가 어디부터 다시 시작할지 찾습니다.",
  applicationName: "한 수학 지도",
  keywords: ["수학 교육과정", "선수개념", "학습 결손", "공통수학", "초등 수학", "중등 수학"],
  openGraph: {
    title: "한 수학 지도",
    description:
      "초1부터 고1 공통수학까지, 학교 수학의 흐름과 단원 연결을 한 장으로 봅니다.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          본문으로 건너뛰기
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
