import type { Metadata } from "next";
import { Poppins, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";

// Display (headings) — Poppins: geometric, confident (BeeEnglish landing)
const display = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});
// Body (UI text) — Be Vietnam Pro: clean, full Vietnamese coverage
const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
// Vietnamese display fallback (Poppins lacks vi glyphs) — Be Vietnam Pro
const vietnamese = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-vn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bee IELTS — Luyện IELTS vui như chơi, lên band thật",
  description:
    "Nền tảng luyện IELTS gamified: từ vựng & ngữ pháp kiểu Duolingo, luyện đủ 4 kỹ năng, AI chấm Writing & Speaking theo band score tức thì. Bắt đầu miễn phí.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable} ${vietnamese.variable}`}>
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            // Sage is a light-first theme: only honour an explicit dark choice,
            // never auto-switch to dark from the OS preference.
            __html: `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors closeButton theme="light" />
      </body>
    </html>
  );
}
