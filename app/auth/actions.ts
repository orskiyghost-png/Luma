"use server";

import { redirect } from "next/navigation";
import { normalizeSupabaseUrl } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null; message?: string | null };

function hasSupabaseConfig() {
  return Boolean(normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) return "https://" + process.env.VERCEL_URL;
  return "http://localhost:3000";
}

function getAge(dateOfBirth: string) {
  const birth = new Date(dateOfBirth + "T00:00:00Z");
  if (Number.isNaN(birth.getTime()) || birth > new Date()) return -1;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const month = today.getUTCMonth() - birth.getUTCMonth();
  if (month < 0 || (month === 0 && today.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!hasSupabaseConfig()) return { error: "Вход временно недоступен: подключение к Supabase не настроено для этого окружения." };
  if (!email.includes("@")) return { error: "Введите корректный email." };
  if (password.length < 8) return { error: "Пароль должен содержать минимум 8 символов." };
  if (getAge(dateOfBirth) < 16) return { error: "Регистрация доступна только с 16 лет." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { date_of_birth: dateOfBirth, display_name: displayName }, emailRedirectTo: siteUrl() + "/auth/callback" },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) return { error: "Аккаунт с таким email уже существует. Переключитесь на «Войти»." };
    if (/rate limit/i.test(error.message)) return { error: "Слишком много попыток. Подождите пару минут и попробуйте снова." };
    return { error: "Не удалось создать аккаунт. Проверьте данные и попробуйте ещё раз." };
  }
  if (data.session) redirect("/profile");
  redirect("/auth?message=" + encodeURIComponent("Проверьте почту и подтвердите аккаунт по ссылке из письма"));
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!hasSupabaseConfig()) return { error: "Вход временно недоступен: подключение к Supabase не настроено для этого окружения." };
  if (!email.includes("@") || !password) return { error: "Введите email и пароль." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) return { error: "Подтвердите email по ссылке из письма, затем повторите вход." };
    return { error: "Не удалось войти. Проверьте email и пароль." };
  }
  redirect("/profile");
}

export async function requestPasswordReset(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!hasSupabaseConfig()) return { error: "Восстановление временно недоступно: подключение к Supabase не настроено." };
  if (!email.includes("@")) return { error: "Введите email, на который зарегистрирован аккаунт." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: siteUrl() + "/auth/callback?type=recovery" });
  if (error) return { error: "Не удалось отправить письмо. Проверьте email и настройки почты Supabase." };
  return { error: null, message: "Если аккаунт существует, письмо для восстановления уже отправлено." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
