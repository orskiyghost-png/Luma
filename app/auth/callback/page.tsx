"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Страница возврата после Google.
 *
 * Работает детерминированно и не зависит от внутреннего flowType библиотеки:
 * 1. implicit-поток (основной): Supabase возвращает сессию в хэше адреса
 *    (#access_token=...&refresh_token=...) — мы сами вызываем setSession.
 * 2. PKCE (запасной): приходит ?code=... — обмениваем его на сессию.
 */
export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);

    function fail(message: string, detail?: string) {
      if (!cancelled) {
        setError(message);
        if (detail) setDetails(detail);
      }
    }

    async function completeLogin() {
      // 0) Если Supabase вернул ошибку вместо токена — показываем её текст.
      const returnedError =
        hash.get("error_description") ??
        hash.get("error") ??
        query.get("error_description") ??
        query.get("error");
      if (returnedError) {
        fail(`Google вернул ошибку: ${returnedError}`);
        return;
      }

      // Уже вошли (например, сессия сохранилась ранее)?
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.history.replaceState(null, "", "/auth/callback");
          window.location.replace("/profile");
          return;
        }
      } catch {
        // игнорируем — просто продолжаем установку сессии.
      }

      // 1) Основной путь: implicit-поток, сессия в хэше.
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        if (error) {
          fail(`Supabase не принял сессию: ${error.message}`);
          return;
        }
        window.history.replaceState(null, "", "/auth/callback");
        window.location.replace("/profile");
        return;
      }

      // 2) Запасной путь: PKCE (?code=...).
      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          fail(`Не удалось завершить вход по коду: ${error.message}`);
          return;
        }
        window.history.replaceState(null, "", "/auth/callback");
        window.location.replace("/profile");
        return;
      }

      const paramNames = [...new Set([...hash.keys(), ...query.keys()])];
      fail(
        "Сессия не пришла от Supabase. Попробуйте войти ещё раз.",
        paramNames.length > 0
          ? `Параметры возврата: ${paramNames.join(", ")}`
          : "Параметры возврата отсутствуют.",
      );
    }

    void completeLogin();
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
            <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
            {details && <p className="mt-2 break-words text-xs leading-5 text-slate-400">{details}</p>}
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
