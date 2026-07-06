import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "甄選入學成績倍率篩選系統",
  description: "技專校院甄選入學倍率與成績分布模擬工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
