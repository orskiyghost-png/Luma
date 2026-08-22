"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "luma-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage может быть недоступен (приватный режим) — просто не показываем.
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center">
        <p className="flex-1 text-sm leading-6 text-slate-600">
          Мы используем только технические cookie, необходимые для входа и работы сервиса.
          Подробнее — в{" "}
          <Link href="/legal/privacy" className="font-bold text-ink underline">
            Политике конфиденциальности
          </Link>
          .
        </p>
        <button type="button" onClick={accept} className="primary-button shrink-0">
          Понятно
        </button>
      </div>
    </div>
  );
}
