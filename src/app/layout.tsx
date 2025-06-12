// 파일: src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";

// v3든 v4든 이 import 구문은 필수입니다.
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "인터랙티브 NITI 추세 분석",
  description: "각종 지수의 일중 추세 강도를 분석합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // <html lang="ko"> 로 변경하면 웹 접근성에 더 좋습니다.
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
