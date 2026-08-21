"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  redirect("/auth?message=Проверьте почту%20для%20подтверждения%20аккаунта");
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email.includes("@") || !password) return { error: "Введите email и пароль." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Не удалось войти. Проверьте email и пароль." };

  redirect("/profile");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
