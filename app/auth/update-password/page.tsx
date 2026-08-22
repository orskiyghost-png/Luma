"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setReady(Boolean(data.session));
    });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Новый пароль должен содержать минимум 8 символов.");
      return;
    }
    if (password !== confirmation) {
      setError("Пароли не совпадают.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("Не удалось обновить пароль. Запросите новую ссылку для восстановления.");
      setPending(false);
      return;
    }
    await supabase.auth.signOut();
    router.replace("/auth?message=" + encodeURIComponent("Пароль обновлён. Теперь можно войти с новым паролем."));
  }

  return (
    <main className="auth-page callback-page">
      <section className="auth-form-card callback-card animate-reveal">
        <Link href="/" className="auth-mobile-brand"><span className="auth-brand-mark">L</span><span>Luma</span></Link>
        <p className="auth-kicker"><span className="auth-kicker-dot" /> Luma / recovery</p>
        <h1 className="callback-title">Новый пароль.</h1>
        <p className="callback-detail">{ready ? "Создай новый пароль для своего пространства." : "Проверяем ссылку восстановления."}</p>
        {!ready ? <div className="callback-loader" aria-label="Проверяем ссылку" role="status"><span /><span /><span /></div> : <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field"><label className="auth-label" htmlFor="password">Новый пароль</label><input className="auth-input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
          <div className="auth-field"><label className="auth-label" htmlFor="confirmation">Повтори пароль</label><input className="auth-input" id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
          {error && <div className="auth-error" role="alert"><span className="auth-error-icon">!</span><span>{error}</span></div>}
          <button className="primary-button auth-submit" type="submit" disabled={pending}>{pending ? "Обновляем..." : "Сохранить новый пароль"}<span aria-hidden="true">→</span></button>
        </form>}
        <Link href="/auth" className="auth-back">Вернуться ко входу <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
