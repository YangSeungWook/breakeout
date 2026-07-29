import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "BREAKOUT · 벽돌깨기",
  description:
    "PC 키보드·마우스와 모바일 터치를 모두 지원하는 반응형 레트로 벽돌깨기 게임",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 게임 중 더블탭 확대와 핀치줌으로 조작이 어긋나는 것을 막는다
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#05070f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
