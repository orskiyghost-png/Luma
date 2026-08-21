"use server";

import { redirect } from "next/navigation";
import { normalizeSupabaseUrl } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";

/**
 * DEV-удобство: на бесплатном тарифе Supabase письма подтверждения
 * почти не доходят (жёсткие лимиты + спам-фильтры). Пока приложение
 * работает в режиме разработки и доступен сервисный ключ, мы сами
 * подтверждаем email нового пользователя через Admin API и сразу
 * входим в аккаунт — письмо не требуется.
 *
 * В production (NODE_ENV === "production") этот путь отключён:
 * там подтверждение почты обязательно.
 */
async function tryDevAutoConfirmAndSignIn(
  userId: string,
  email: string,
  password: string,
): Promise<boolean> {
  const base = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || process.env.NODE_ENV === "production") return false;

  try {
    const response = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_confirm: true }),
    });
    if (!response.ok) return false;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return !error && Boolean(data.session);
  } catch {
    return false;
  }
}

export type AuthState = { error: string | null };

function getAge(dateOfBirth: string) {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
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

/**
 * DEV-лечение «старых» аккаунтов: зарегистрированных до появления
 * авто-подтверждения. Находит пользователя по email через Admin API
 * и подтверждает его почту. Только dev + сервисный ключ.
 */
async function devConfirmExistingUser(email: string): Promise<boolean> {
  const base = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || process.env.NODE_ENV === "production") return false;

  try {
    const listResponse = await fetch(`${base}/auth/v1/admin/users?per_page=200`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!listResponse.ok) return false;
    const payload = (await listResponse.json()) as { users?: Array<{ id: string; email?: string }> };
    const target = payload.users?.find((u) => u.email?.toLowerCase() === email);
    if (!target) return false;

    const confirm = await fetch(`${base}/auth/v1/admin/users/${target.id}`, {
      method: "PUT",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_confirm: true }),
    });
    return confirm.ok;
  } catch {
    return false;
  }
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!email.includes("@")) return { error: "Введите корректный email." };
  if (password.length < 8) return { error: "Пароль должен содержать минимум 8 символов." };
  if (getAge(dateOfBirth) < 16) return { error: "Регистрация доступна только с 16 лет." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { date_of_birth: dateOfBirth, display_name: displayName },
    },
  });

  if (error) return { error: error.message };
  if (data.session) redirect("/profile");

  // Dev-режим: подтверждаем аккаунт сами и входим без письма.
  if (data.user) {
    const signedIn = await tryDevAutoConfirmAndSignIn(data.user.id, email, password);
    if (signedIn) redirect("/profile");
  }

  // Адрес перенаправления должен содержать только ASCII-символы:
  // кириллица в заголовке x-action-redirect роняет сервер с ERR_INVALID_CHAR.
  redirect(`/auth?message=${encodeURIComponent("Проверьте почту и подтвердите аккаунт по ссылке из письма")}`);
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email.includes("@") || !password) return { error: "Введите email и пароль." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Аккаунт создан раньше, но почта так и не была подтверждена
    // (письма с бесплатного тарифа не доходили). В dev подтверждаем сами.
    if (/confirm/i.test(error.message)) {
      const fixed = await devConfirmExistingUser(email);
      if (fixed) {
        const retry = await supabase.auth.signInWithPassword({ email, password });
        if (!retry.error) redirect("/profile");
      }
      return { error: "Аккаунт найден, но почта не подтверждена. Попробуйте войти ещё раз." };
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
