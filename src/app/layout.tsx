import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";

// Display (headings) — Bricolage Grotesque
const display = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});
// Body (UI text) — Hanken Grotesk
const body = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});
// Vietnamese coverage fallback for both stacks — Be Vietnam Pro
const vietnamese = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-vn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bee IELTS — Học tiếng Anh nhanh & vui",
  description:
    "Nền tảng học tiếng Anh Gen-Z: từ vựng Duolingo-style, luyện 4 kỹ năng IELTS, AI chấm Writing & Speaking tức thì.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable} ${vietnamese.variable}`}>
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            // Honey is a light-first theme: only honour an explicit dark choice,
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
