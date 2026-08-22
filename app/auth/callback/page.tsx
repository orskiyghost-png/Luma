"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CallbackStatus = { error: string | null; detail: string | null };

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<CallbackStatus>({ error: null, detail: null });

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const recovery = query.get("type") === "recovery" || hash.get("type") === "recovery";
      const returnedError = hash.get("error_description") ?? hash.get("error") ?? query.get("error_description") ?? query.get("error");

      if (returnedError) {
        if (!cancelled) setStatus({ error: "Не удалось завершить авторизацию.", detail: returnedError });
        return;
      }

      let supabase;
      try {
        supabase = createClient();
      } catch {
        if (!cancelled) setStatus({ error: "Авторизация временно недоступна.", detail: "Проверьте подключение Supabase в окружении deployment." });
        return;
      }

      const destination = recovery ? "/auth/update-password" : "/profile";
      const go = () => {
        if (cancelled) return;
        window.history.replaceState(null, "", destination);
        window.location.replace(destination);
      };

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          go();
          return;
        }
      } catch {
        // Continue with the explicit token or code exchange below.
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) {
          if (!cancelled) setStatus({ error: "Сессия не была принята.", detail: "Ссылка могла устареть. Запросите новое письмо и попробуйте ещё раз." });
          return;
        }
        go();
        return;
      }

      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) setStatus({ error: "Не удалось подтвердить ссылку.", detail: "Запросите новое письмо и повторите переход." });
          return;
        }
        go();
        return;
      }

      if (!cancelled) setStatus({ error: "Ссылка авторизации неполная.", detail: "Откройте ссылку из письма ещё раз или вернитесь к форме входа." });
    }

    void completeAuth();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="auth-page callback-page">
      <section className="auth-form-card callback-card animate-reveal">
        <Link href="/" className="auth-mobile-brand"><span className="auth-brand-mark">L</span><span>Luma</span></Link>
        {status.error ? <><p className="auth-kicker"><span className="auth-kicker-dot" /> Luma / access</p><h1 className="callback-title">{status.error}</h1><p className="callback-detail">{status.detail}</p><Link href="/auth" className="primary-button auth-submit">Вернуться ко входу <span aria-hidden="true">→</span></Link></> : <><div className="callback-loader" aria-hidden="true"><span /><span /><span /></div><p className="auth-kicker">Luma / secure handoff</p><h1 className="callback-title">Проверяем доступ.</h1><p className="callback-detail">Подготавливаем твоё пространство. Это займёт несколько секунд.</p></>}
      </section>
    </main>
  );
}
