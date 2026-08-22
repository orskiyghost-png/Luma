"use server";

import { redirect } from "next/navigation";
import { normalizeSupabaseUrl } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";

export type AuthField = "email" | "password" | "dateOfBirth" | "displayName" | "form";
export type AuthState = { error: string | null; fieldErrors?: Partial<Record<AuthField, string>> };

function logAuthFailure(action: string, error: { message?: string; status?: number; code?: string }) {
  console.warn(`[auth:${action}]`, { status: error.status ?? null, code: error.code ?? null, message: error.message ?? "Неизвестная ошибка" });
}

function mapAuthError(action: string, error: { message?: string; status?: number; code?: string }): AuthState {
  logAuthFailure(action, error);
  const message = (error.message ?? "").toLowerCase();

  if (/already registered|already exists|user already|email.*taken|duplicate/.test(message)) {
    return { error: null, fieldErrors: { email: "Этот email уже зарегистрирован. Войдите или используйте другой адрес." } };
  }
  if (/invalid.*email|email.*invalid|valid email/.test(message)) {
    return { error: null, fieldErrors: { email: "Введите корректный email, например имя@example.com." } };
  }
  if (/password.*(short|weak|characters)|weak password|password should/.test(message)) {
    return { error: null, fieldErrors: { password: "Пароль слишком простой. Используйте минимум 8 символов." } };
  }
  if (/captcha|turnstile|bot|challenge/.test(message)) {
    return { error: null, fieldErrors: { form: "Проверка безопасности не пройдена. Обновите страницу и попробуйте ещё раз." } };
  }
  if (/rate limit|too many|limit exceeded/.test(message)) {
    return { error: "Слишком много попыток подряд. Подождите несколько минут и попробуйте ещё раз." };
  }
  if (/email not confirmed|confirm your email|not confirmed/.test(message)) {
    return { error: "Аккаунт создан, но email ещё не подтверждён. Откройте письмо от Luma и перейдите по ссылке." };
  }
  if (/invalid login|invalid credentials|wrong password|user not found/.test(message)) {
    return { error: "Не удалось войти. Проверьте email и пароль." };
  }
  return { error: "Не удалось выполнить действие. Проверьте данные и попробуйте ещё раз." };
}

async function tryDevAutoConfirmAndSignIn(userId: string, email: string, password: string): Promise<boolean> {
  const base = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || process.env.NODE_ENV === "production") return false;

  try {
    const response = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
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

async function devAdminCreateUser(email: string, password: string, metadata: Record<string, unknown>): Promise<"ok" | "exists" | "failed"> {
  const base = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || process.env.NODE_ENV === "production") return "failed";

  try {
    const response = await fetch(`${base}/auth/v1/admin/users`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
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
  if (!base || !serviceKey || process.env.NODE_ENV === "production") return false;

  try {
    const listResponse = await fetch(`${base}/auth/v1/admin/users?per_page=200`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    if (!listResponse.ok) return false;
    const payload = (await listResponse.json()) as { users?: Array<{ id: string; email?: string }> };
    const target = payload.users?.find((user) => user.email?.toLowerCase() === email);
    if (!target) return false;
    const confirm = await fetch(`${base}/auth/v1/admin/users/${target.id}`, {
      method: "PUT",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
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
  const fieldErrors: Partial<Record<AuthField, string>> = {};

  if (!email.includes("@") || email.length < 5) fieldErrors.email = "Введите корректный email, например имя@example.com.";
  if (password.length < 8) fieldErrors.password = "Пароль должен содержать минимум 8 символов.";
  if (!dateOfBirth) fieldErrors.dateOfBirth = "Укажите дату рождения.";
  else if (getAge(dateOfBirth) < 16) fieldErrors.dateOfBirth = "Регистрация доступна только с 16 лет.";
  if (Object.keys(fieldErrors).length) return { error: null, fieldErrors };

  const supabase = await createClient();
  const devResult = await devAdminCreateUser(email, password, { date_of_birth: dateOfBirth, display_name: displayName });
  if (devResult === "ok" || devResult === "exists") {
    const signedIn = await supabase.auth.signInWithPassword({ email, password });
    if (!signedIn.error) redirect("/profile");
    if (devResult === "exists") return { error: null, fieldErrors: { email: "Аккаунт с таким email уже существует. Переключитесь на «Войти»." } };
  }

  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { date_of_birth: dateOfBirth, display_name: displayName } } });
  if (error) return mapAuthError("регистрация", error);
  if (data.session) redirect("/profile");
  if (data.user) {
    const signedIn = await tryDevAutoConfirmAndSignIn(data.user.id, email, password);
    if (signedIn) redirect("/profile");
  }

  // В production Supabase может потребовать подтверждение email. Письма здесь не отправляем вручную.
  redirect(`/auth?message=${encodeURIComponent("Аккаунт создан. Если подтверждение email включено, откройте письмо от Luma.")}`);
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const fieldErrors: Partial<Record<AuthField, string>> = {};
  if (!email.includes("@")) fieldErrors.email = "Введите корректный email.";
  if (!password) fieldErrors.password = "Введите пароль.";
  if (Object.keys(fieldErrors).length) return { error: null, fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) {
      const fixed = await devConfirmExistingUser(email);
      if (fixed) {
        const retry = await supabase.auth.signInWithPassword({ email, password });
        if (!retry.error) redirect("/profile");
      }
    }
    return mapAuthError("вход", error);
  }
  redirect("/profile");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
