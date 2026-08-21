import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luma — карта живых заметок",
  description: "Безопасная социальная карта для заметок, мест и людей.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
