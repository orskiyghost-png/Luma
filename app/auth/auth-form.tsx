"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signInWithGoogleBrowser } from "@/lib/supabase/google";
import { signIn, signUp, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

type AuthFormProps = { initialMode: "signin" | "signup"; message?: string };

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.3A10.7 10.7 0 0 1 12 4c5.2 0 8.6 4 9.7 6a11.8 11.8 0 0 1-3.1 3.6M6.2 6.2C4.5 7.3 3.3 9 2.3 10c1.1 1.9 4.5 6 9.7 6 1 0 2-.2 2.8-.5" /></svg> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M2.3 10C3.4 8.1 6.8 4 12 4s8.6 4.1 9.7 6c-1.1 1.9-4.5 6-9.7 6s-8.6-4.1-9.7-6Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
}

export function AuthForm({ initialMode, message }: AuthFormProps) {
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState);
  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const isSignup = mode === "signup";
  const state = isSignup ? signUpState : signInState;
  const pending = isSignup ? signUpPending : signInPending;

  async function handleGoogle() {
    setGoogleError(null);
    setGooglePending(true);
    const error = await signInWithGoogleBrowser();
    if (error) {
      setGoogleError(error);
      setGooglePending(false);
    }
  }

  function switchMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setShowPassword(false);
    setGoogleError(null);
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-story animate-reveal">
          <Link href="/" className="auth-brand"><span className="auth-brand-mark">L</span><span>Luma</span></Link>
          <div className="auth-story-copy"><p className="auth-kicker"><span className="auth-kicker-dot" /> Private map / 01</p><h1>Найди свой ритм<br /><span>в городе.</span></h1><p>Твои места, заметки и люди — в одном спокойном пространстве, где контроль всегда остаётся у тебя.</p></div>
          <div className="auth-story-footer"><span className="font-mono text-xs text-tide">ACCESS LAYER</span><span className="auth-story-line" /><span className="font-mono text-xs text-[var(--text-muted)]">SAFE BY DEFAULT</span></div>
        </aside>

        <section className="auth-form-card animate-reveal" style={{ animationDelay: "100ms" }}>
          <div className="auth-form-top"><Link href="/" className="auth-mobile-brand"><span className="auth-brand-mark">L</span><span>Luma</span></Link><span className="auth-secure"><span className="auth-secure-dot" /> secure access</span></div>
          <div className="auth-heading"><p className="auth-kicker"><span className="auth-kicker-dot" /> Luma / account</p><h2>{isSignup ? "Создай свой ориентир." : "С возвращением."}</h2><p>{isSignup ? "Один аккаунт для мест, заметок и осознанных разговоров." : "Войди, чтобы продолжить с личной картой."}</p></div>

          <div className="auth-tabs" role="tablist" aria-label="Режим аккаунта"><button type="button" role="tab" aria-selected={!isSignup} className={!isSignup ? "auth-tab is-active" : "auth-tab"} onClick={() => switchMode("signin")}>Войти</button><button type="button" role="tab" aria-selected={isSignup} className={isSignup ? "auth-tab is-active" : "auth-tab"} onClick={() => switchMode("signup")}>Создать аккаунт</button></div>

          {message && <div className="auth-message" role="status">{message}</div>}
          {(state.error || googleError) && <div className="auth-error" role="alert"><span className="auth-error-icon">!</span><span>{googleError ?? state.error}</span></div>}

          <form action={isSignup ? signUpAction : signInAction} className="auth-form">
            {isSignup && <div className="auth-field"><label htmlFor="displayName" className="auth-label">Имя</label><input id="displayName" name="displayName" type="text" autoComplete="name" placeholder="Как к тебе обращаться" className="auth-input" suppressHydrationWarning /></div>}
            <div className="auth-field"><label htmlFor="email" className="auth-label">Email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" className="auth-input" required suppressHydrationWarning /></div>
            <div className="auth-field"><div className="flex items-center justify-between"><label htmlFor="password" className="auth-label">Пароль</label>{!isSignup && <button type="button" className="auth-inline-action" onClick={() => setGoogleError("Восстановление пароля будет доступно после подключения email recovery в Supabase.")}>Забыли пароль?</button>}</div><div className="auth-password-wrap"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} placeholder="Минимум 8 символов" minLength={8} className="auth-input auth-password-input" required suppressHydrationWarning /><button type="button" className="auth-password-toggle" aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"} onClick={() => setShowPassword((value) => !value)}><EyeIcon hidden={showPassword} /></button></div></div>
            {isSignup && <div className="auth-field"><label htmlFor="dateOfBirth" className="auth-label">Дата рождения</label><input id="dateOfBirth" name="dateOfBirth" type="date" className="auth-input" required suppressHydrationWarning /><p className="auth-hint">Нужно для безопасных функций и возрастных ограничений.</p></div>}
            <button type="submit" className="primary-button auth-submit" disabled={pending}>{pending ? <><span className="auth-spinner" /> Обрабатываем...</> : <>{isSignup ? "Создать аккаунт" : "Войти"}<ArrowIcon /></>}</button>
          </form>

          <div className="auth-divider"><span>или</span></div>
          <button type="button" onClick={handleGoogle} className="auth-google" disabled={googlePending}><span className="auth-google-mark">G</span><span>{googlePending ? "Открываем Google..." : "Продолжить через Google"}</span><ArrowIcon /></button>
          <div className="auth-trust"><span className="auth-trust-icon">✓</span><span>Мы не показываем твою точную позицию без твоего согласия.</span></div>
          <p className="auth-legal">Продолжая, ты принимаешь <Link href="/legal">правила Luma</Link> и нашу политику приватности.</p>
          <Link href="/" className="auth-back">Вернуться на главную <ArrowIcon /></Link>
        </section>
      </div>
    </main>
  );
}
