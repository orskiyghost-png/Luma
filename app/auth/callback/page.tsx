"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Страница возврата после Google.
 * Supabase возвращает сессию в хэше адреса (#access_token=...).
 * Браузерный клиент сам распознаёт её и сохраняет в cookie,
 * после чего мы отправляем пользователя в профиль.
 */
export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function waitForSession() {
      // Даём клиенту время обработать #access_token из адреса страницы.
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (cancelled) return;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.location.replace("/profile");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      if (!cancelled) {
        setError("Не удалось завершить вход через Google. Попробуйте ещё раз.");
      }
    }

    void waitForSession();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="auth-shell">
      <div className="form-card text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-black tracking-tight">Вход не завершён</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">{error}</p>
            <Link href="/auth" className="primary-button mt-6 inline-flex">Вернуться ко входу</Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-tide border-t-transparent" />
            <h1 className="text-2xl font-black tracking-tight">Завершаем вход…</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">Секунду, переносим вас в профиль.</p>
          </>
        )}
      </div>
    </main>
  );
}
