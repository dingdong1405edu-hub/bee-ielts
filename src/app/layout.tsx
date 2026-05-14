import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bee IELTS — Học tiếng Anh nhanh & vui",
  description:
    "Nền tảng học tiếng Anh Gen-Z: từ vựng Duolingo-style, luyện 4 kỹ năng IELTS, AI chấm Writing & Speaking tức thì.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={jakarta.variable}>
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors closeButton theme="system" />
      </body>
    </html>
  );
}
