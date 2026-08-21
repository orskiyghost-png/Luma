"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Страница возврата после Google.
 * Поддерживает implicit-поток Supabase (#access_token=... в адресе):
 * браузерный клиент сам распознаёт сессию и сохраняет её в cookie,
 * после чего мы отправляем пользователя в профиль.
 */
export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    // Диагностика возврата: имена параметров (не значения!) и текст ошибки,
    // если Supabase вернул ошибку вместо токена.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const paramNames = [...new Set([...hash.keys(), ...query.keys()])];
    const returnedError =
      hash.get("error_description") ??
      hash.get("error") ??
      query.get("error_description") ??
      query.get("error");

    async function waitForSession() {
      for (let attempt = 0; attempt < 15; attempt += 1) {
        if (cancelled) return;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.location.replace("/profile");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      if (!cancelled) {
        if (returnedError) {
          setError(`Google вернул ошибку: ${returnedError}`);
        } else {
          setError("Сессия не пришла от Supabase. Попробуйте войти ещё раз.");
        }
        setDetails(paramNames.length > 0 ? `Параметры возврата: ${paramNames.join(", ")}` : "Параметры возврата отсутствуют.");
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
