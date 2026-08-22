"use server";

import { redirect } from "next/navigation";
import { normalizeSupabaseUrl } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null };

function canUsePreviewAdmin() {
  return process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview";
}

function hasSupabaseConfig() {
  return Boolean(normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
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

async function devAdminCreateUser(email: string, password: string, metadata: Record<string, unknown>): Promise<"ok" | "exists" | "failed"> {
  const base = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!canUsePreviewAdmin() || !base || !serviceKey) return "failed";
  try {
    const response = await fetch(base + "/auth/v1/admin/users", {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: metadata }),
    });
    if (response.ok) return "ok";
    if (response.status === 422) return "exists";
    return "failed";
  } catch {
    return "failed";
  }
}

async function devConfirmExistingUser(email: string): Promise<boolean> {
  const base = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!canUsePreviewAdmin() || !base || !serviceKey) return false;
  try {
    const listResponse = await fetch(base + "/auth/v1/admin/users?per_page=200", { headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey } });
    if (!listResponse.ok) return false;
    const payload = (await listResponse.json()) as { users?: Array<{ id: string; email?: string }> };
    const target = payload.users?.find((user) => user.email?.toLowerCase() === email);
    if (!target) return false;
    const confirmResponse = await fetch(base + "/auth/v1/admin/users/" + target.id, {
      method: "PUT",
      headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email_confirm: true }),
    });
    return confirmResponse.ok;
  } catch {
    return false;
  }
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
  const devResult = await devAdminCreateUser(email, password, { date_of_birth: dateOfBirth, display_name: displayName });
  if (devResult === "ok" || devResult === "exists") {
    const signedIn = await supabase.auth.signInWithPassword({ email, password });
    if (!signedIn.error) redirect("/profile");
    if (devResult === "exists") return { error: "Аккаунт с таким email уже существует. Переключитесь на «Войти»." };
  }

  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { date_of_birth: dateOfBirth, display_name: displayName } } });
  if (error) {
    if (/rate limit/i.test(error.message)) return { error: "Слишком много регистраций подряд. Подождите пару минут и попробуйте ещё раз." };
    return { error: error.message };
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
    if (/confirm/i.test(error.message)) {
      const fixed = await devConfirmExistingUser(email);
      if (fixed) {
        const retry = await supabase.auth.signInWithPassword({ email, password });
        if (!retry.error) redirect("/profile");
      }
      return { error: "Аккаунт найден, но почта ещё не подтверждена. Для preview мы попробовали исправить это автоматически. Повторите вход." };
    }
    return { error: "Не удалось войти. Проверьте email и пароль." };
  }
  redirect("/profile");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
