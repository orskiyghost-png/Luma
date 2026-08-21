"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signInWithGoogleBrowser } from "@/lib/supabase/google";
import { signIn, signUp, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

type AuthFormProps = {
  initialMode: "signin" | "signup";
  message?: string;
};

export function AuthForm({ initialMode, message }: AuthFormProps) {
  const [mode, setMode] = useState(initialMode);
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
    if (error) setGoogleError(error);
    if (error) setGooglePending(false);
  }

  return (
    <div className="form-card">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-tide">Luma account</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">{isSignup ? "Твой новый ориентир" : "С возвращением"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{isSignup ? "Создайте аккаунт, чтобы сохранять места и заметки." : "Войдите, чтобы продолжить с безопасной карты."}</p>
        </div>
        <span className="rounded-xl bg-ink px-3 py-2 text-sm font-black text-white">L</span>
      </div>

      {message && <p className="mb-4 rounded-xl bg-tide/10 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
      {(state.error || googleError) && <p className="error-message mb-4">{googleError ?? state.error}</p>}

      {/* suppressHydrationWarning: приватные браузеры (например, DuckDuckGo)
          дописывают свои атрибуты в поля ввода и вызывают ложную ошибку
          гидрации React — на работу формы это не влияет. */}
      <form action={isSignup ? signUpAction : signInAction} className="grid gap-4" suppressHydrationWarning>
        {isSignup && <div className="field"><label htmlFor="displayName">Имя</label><input id="displayName" name="displayName" placeholder="Как вас называть" autoComplete="name" /></div>}
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required /></div>
        <div className="field"><label htmlFor="password">Пароль</label><input id="password" name="password" type="password" placeholder="Минимум 8 символов" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} required /></div>
        {isSignup && <div className="field"><label htmlFor="dateOfBirth">Дата рождения</label><input id="dateOfBirth" name="dateOfBirth" type="date" autoComplete="bday" required /><p className="text-xs leading-5 text-slate-500">Нужна только для проверки минимального возраста 16 лет. Она не публикуется.</p></div>}
        <button className="primary-button mt-2 w-full disabled:cursor-wait disabled:opacity-60" type="submit" disabled={pending}>{pending ? "Подождите…" : isSignup ? "Создать аккаунт" : "Войти"}</button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.15em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />или<span className="h-px flex-1 bg-slate-200" /></div>
      <button className="secondary-button w-full disabled:cursor-wait disabled:opacity-60" type="button" onClick={handleGoogle} disabled={googlePending}>{googlePending ? "Открываем Google…" : "Продолжить через Google"}</button>

      <p className="mt-7 text-center text-sm text-slate-500">{isSignup ? "Уже есть аккаунт?" : "Впервые в Luma?"}{" "}<button type="button" className="font-black text-ink underline decoration-tide decoration-2 underline-offset-4" onClick={() => setMode(isSignup ? "signin" : "signup")}>{isSignup ? "Войти" : "Зарегистрироваться"}</button></p>
      <Link href="/" className="mt-6 block text-center text-xs font-bold text-slate-400 hover:text-ink">← Вернуться на главную</Link>
    </div>
  );
}
