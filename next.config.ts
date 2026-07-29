import type { NextConfig } from "next";

/**
 * GitHub Pages 프로젝트 사이트는 저장소 이름이 하위 경로가 된다.
 * https://yangseungwook.github.io/breakeout/
 *
 * basePath 는 배포 워크플로(GITHUB_PAGES=true)에서만 붙인다.
 * 로컬 개발은 http://localhost:3000 루트를 그대로 쓴다.
 */
const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 서버 없이 정적 파일만으로 배포한다 (out/ 디렉터리 생성)
  output: "export",
  basePath: isGitHubPages ? "/breakeout" : "",
  // 정적 export 에서는 이미지 최적화 서버를 쓸 수 없다
  images: { unoptimized: true },
  // 개발 중 좌하단 인디케이터가 모바일 HUD를 가려서 끈다
  devIndicators: false,
};

export default nextConfig;
