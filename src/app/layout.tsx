import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sổ tay tính từ kinh tế - JP",
  description: "Sổ tay chuyên tính từ kinh tế tiếng Nhật với UI hiện đại",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Serif+JP:wght@400;700&display=swap" 
          rel="stylesheet" 
        />
        <script dangerouslySetInnerHTML={{__html: `
          (function(){
            try {
              var t = localStorage.getItem('theme');
              var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
              var theme = t || (prefersDark ? 'dark' : 'light');
              document.documentElement.setAttribute('data-theme', theme);
            } catch(e) {}
          })();
        `}} />
      </head>
      <body
        className={`${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
