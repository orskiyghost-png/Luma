"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);

    function fail(message: string, detail?: string) {
      if (cancelled) return;
      setError(message);
      setDetails(detail ?? null);
    }

    async function completeLogin() {
      const returnedError = hash.get("error_description") ?? hash.get("error") ?? query.get("error_description") ?? query.get("error");
      if (returnedError) {
        fail("Ссылка для входа недействительна или устарела.", "Supabase сообщил об ошибке возврата. Запросите новую попытку входа.");
        console.warn("[auth:callback] provider returned an error", { hasDescription: Boolean(returnedError) });
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.history.replaceState(null, "", "/auth/callback");
          window.location.replace("/profile");
          return;
        }
      } catch (sessionError) {
        console.warn("[auth:callback] getSession failed", { message: sessionError instanceof Error ? sessionError.message : "unknown" });
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (cancelled) return;
        if (sessionError) {
          console.warn("[auth:callback] setSession failed", { message: sessionError.message, status: sessionError.status ?? null });
          fail("Ссылка для входа недействительна или устарела.", "Сессия не была принята. Начните вход заново, чтобы получить новую ссылку.");
          return;
        }
        window.history.replaceState(null, "", "/auth/callback");
        window.location.replace("/profile");
        return;
      }

      const code = query.get("code");
      if (code) {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (codeError) {
          console.warn("[auth:callback] exchangeCodeForSession failed", { message: codeError.message, status: codeError.status ?? null });
          fail("Ссылка для входа недействительна или устарела.", "Код уже использован, истёк или не совпадает с адресом возврата.");
          return;
        }
        window.history.replaceState(null, "", "/auth/callback");
        window.location.replace("/profile");
        return;
      }

      const parameterNames = [...new Set([...hash.keys(), ...query.keys()])];
      fail("Сессия не пришла от Supabase. Начните вход заново.", parameterNames.length ? `Получены параметры: ${parameterNames.join(", ")}` : "Параметры возврата отсутствуют.");
    }

    void completeLogin();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="auth-shell page-shell">
      <div className="aurora aurora-one" aria-hidden="true" />
      <div className="form-card text-center">
        {error ? <>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[rgba(255,155,155,.3)] bg-[rgba(255,155,155,.1)] text-xl text-[var(--danger)]" aria-hidden="true">!</div>
          <h1 className="mt-5 text-2xl font-black tracking-tight">Вход не завершён</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{error}</p>
          {details && <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{details}</p>}
          <div className="mt-6 grid gap-3"><Link href="/auth" className="primary-button">Начать вход заново</Link><Link href="/" className="secondary-button">Вернуться на главную</Link></div>
        </> : <>
          <div className="spinner spinner-light mx-auto mb-5 h-10 w-10" aria-hidden="true" />
          <h1 className="text-2xl font-black tracking-tight">Завершаем вход…</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Секунду, переносим тебя в профиль.</p>
        </>}
      </div>
    </main>
  );
}
