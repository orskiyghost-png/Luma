import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CookieConsent } from "@/components/cookie-consent";

const lumaSans = localFont({
  src: [
    { path: "./fonts/DejaVuSans.ttf", weight: "400", style: "normal" },
    { path: "./fonts/DejaVuSans-Bold.ttf", weight: "700 900", style: "normal" },
  ],
  variable: "--font-luma",
  display: "swap",
});

const themeScript = `(() => {
  try {
    const saved = window.localStorage.getItem("luma-theme");
    const theme = saved === "light" || saved === "dark"
      ? saved
      : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = "dark";
  }
})()`;

export const metadata: Metadata = {
  title: "Luma — карта живых заметок",
  description: "Спокойная социальная карта для заметок, мест и общения с контролем приватности.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={lumaSans.variable}>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
