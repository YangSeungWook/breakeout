import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 개발 중 좌하단 인디케이터가 모바일 HUD를 가려서 끈다
  devIndicators: false,
};

export default nextConfig;
