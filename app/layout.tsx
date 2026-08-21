import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luma — карта живых заметок",
  description: "Безопасная социальная карта для заметок, мест и людей.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <header className="mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 font-black tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sm text-white">L</span>
            <span>Luma</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-bold text-slate-600">
            <Link href="/auth" className="hover:text-ink">Войти</Link>
            <Link href="/auth?mode=signup" className="rounded-full bg-tide px-4 py-2 text-ink hover:shadow-glow">Создать аккаунт</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
