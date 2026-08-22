"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function signInWithGoogleBrowser(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return "В Preview не заданы настройки Supabase. Добавьте URL проекта и публичный ключ в переменные окружения Vercel.";
  }

  const supabase = createClient();
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, queryParams: { access_type: "offline", prompt: "select_account" } },
  });

  if (error) {
    console.warn("[auth:google] OAuth start failed", { message: error.message, status: error.status ?? null });
    if (/provider.*not enabled|unsupported provider/i.test(error.message)) return "Вход через Google пока не включён в настройках Supabase Auth.";
    return "Не удалось открыть вход через Google. Проверьте настройки OAuth и попробуйте ещё раз.";
  }
  return null;
}
