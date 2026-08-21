"use client";

import { normalizeSupabaseUrl } from "@/lib/supabase/client";

/**
 * Запускает вход через Google прямой ссылкой на /auth/v1/authorize.
 * В отличие от библиотечного метода, ключ (apikey) всегда присутствует
 * в адресе, поэтому Supabase не отвечает «No API key found in request».
 */
export async function signInWithGoogleBrowser(): Promise<string | null> {
  const base = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!base || !key) {
    return "Не заданы настройки Supabase. Добавьте их в настройках Freebuff.";
  }

  const redirectTo = `${window.location.origin}/auth/callback`;
  const authorizeUrl =
    `${base}/auth/v1/authorize?provider=google` +
    `&redirect_to=${encodeURIComponent(redirectTo)}` +
    `&apikey=${encodeURIComponent(key)}`;

  window.location.assign(authorizeUrl);
  return null;
}
