import type { NextConfig } from "next";

/**
 * 정적 사이트로 내보낸다.
 * 콘텐츠가 전부 정적이라 서버가 필요 없고, GitHub Pages·Cloudflare·Vercel 어디에나 그대로 올라간다.
 *
 * GitHub Pages처럼 하위 경로에 올릴 때만 NEXT_PUBLIC_BASE_PATH=/저장소이름 을 준다.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // 정적 호스팅에서 /unit/e1-s2-01/ 같은 주소가 새로고침·직접 진입에도 그대로 열리게 한다.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
