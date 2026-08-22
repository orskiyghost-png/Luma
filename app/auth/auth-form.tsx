"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signInWithGoogleBrowser } from "@/lib/supabase/google";
import { signIn, signUp, type AuthField, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

type AuthFormProps = { initialMode: "signin" | "signup"; message?: string };

function FieldError({ field, errors }: { field: AuthField; errors?: Partial<Record<AuthField, string>> }) {
  const error = errors?.[field];
  return error ? <p className="field-error" id={`${field}-error`} role="alert">{error}</p> : null;
}

export function AuthForm({ initialMode, message }: AuthFormProps) {
  const [mode, setMode] = useState(initialMode);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState);
  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const isSignup = mode === "signup";
  const state = isSignup ? signUpState : signInState;
  const pending = isSignup ? signUpPending : signInPending;
  const errors = state.fieldErrors;

  async function handleGoogle() {
    setGoogleError(null);
    setGooglePending(true);
    const error = await signInWithGoogleBrowser();
    if (error) {
      setGoogleError(error);
      setGooglePending(false);
    }
  }

  function switchMode() {
    setGoogleError(null);
    setMode(isSignup ? "signin" : "signup");
  }

  return (
    <div className="form-card">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent)]">Личный доступ</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">{isSignup ? "Твой новый ориентир" : "С возвращением"}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{isSignup ? "Создай аккаунт, чтобы сохранять места и заметки." : "Войди, чтобы продолжить с безопасной карты."}</p>
        </div>
        <span className="brand-mark shrink-0">L</span>
      </div>

      {message && <p className="info-message mb-4" role="status">{message}</p>}
      {(state.error || googleError || errors?.form) && <p className="error-message mb-4" role="alert">{googleError ?? errors?.form ?? state.error}</p>}

      <form action={isSignup ? signUpAction : signInAction} className="grid gap-4" suppressHydrationWarning>
        {isSignup && <div className="field"><label htmlFor="displayName">Имя</label><input id="displayName" name="displayName" placeholder="Как тебя называть" autoComplete="name" aria-describedby={errors?.displayName ? "displayName-error" : undefined} aria-invalid={Boolean(errors?.displayName)} suppressHydrationWarning /><FieldError field="displayName" errors={errors} /></div>}
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" placeholder="имя@example.com" autoComplete="email" required aria-describedby={errors?.email ? "email-error" : undefined} aria-invalid={Boolean(errors?.email)} suppressHydrationWarning /><FieldError field="email" errors={errors} /></div>
        <div className="field"><label htmlFor="password">Пароль</label><input id="password" name="password" type="password" placeholder="Минимум 8 символов" autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 8 : undefined} required aria-describedby={errors?.password ? "password-error" : undefined} aria-invalid={Boolean(errors?.password)} suppressHydrationWarning /><FieldError field="password" errors={errors} /></div>
        {isSignup && <div className="field"><label htmlFor="dateOfBirth">Дата рождения</label><input id="dateOfBirth" name="dateOfBirth" type="date" autoComplete="bday" required aria-describedby={errors?.dateOfBirth ? "dateOfBirth-error dateOfBirth-help" : "dateOfBirth-help"} aria-invalid={Boolean(errors?.dateOfBirth)} suppressHydrationWarning /><p id="dateOfBirth-help" className="text-xs leading-5 text-[var(--text-muted)]">Нужна только для проверки минимального возраста 16 лет. Она не публикуется.</p><FieldError field="dateOfBirth" errors={errors} /></div>}
        <button className="primary-button mt-2 w-full" type="submit" disabled={pending}>{pending && <span className="spinner" aria-hidden="true" />}{pending ? "Проверяем данные…" : isSignup ? "Создать аккаунт" : "Войти"}</button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]"><span className="h-px flex-1 bg-[var(--line)]" />или<span className="h-px flex-1 bg-[var(--line)]" /></div>
      {googleError && <p className="field-error mb-3" role="alert">{googleError}</p>}
      <button className="secondary-button w-full" type="button" onClick={handleGoogle} disabled={googlePending || pending}>{googlePending && <span className="spinner spinner-light" aria-hidden="true" />}{googlePending ? "Открываем страницу входа…" : "Продолжить через Google"}</button>

      <p className="mt-7 text-center text-sm text-[var(--text-muted)]">{isSignup ? "Уже есть аккаунт?" : "Впервые в Luma?"}{" "}<button type="button" className="font-black text-[var(--text)] underline decoration-[var(--accent)] decoration-2 underline-offset-4" onClick={switchMode}>{isSignup ? "Войти" : "Зарегистрироваться"}</button></p>
      <Link href="/" className="mt-6 block text-center text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)]">← Вернуться на главную</Link>
    </div>
  );
}
