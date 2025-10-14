import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, Geist_Mono } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-sans-jp",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

const notoSerifJp = Noto_Serif_JP({
  variable: "--font-serif-jp",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "900"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Từ điển tính từ kinh tế - JP",
  description: "Từ điển chuyên tính từ kinh tế tiếng Nhật với UI hiện đại",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${notoSansJp.variable} ${notoSerifJp.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
