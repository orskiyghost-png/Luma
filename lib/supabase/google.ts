"use client";

import { normalizeSupabaseUrl } from "@/lib/supabase/client";

/**
 * Builds the Supabase OAuth URL for the current deployment.
 * The redirect is always derived from the active origin so preview and production
 * environments do not share a stale callback URL.
 */
export async function signInWithGoogleBrowser(): Promise<string | null> {
  const base = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!base || !key) {
    return "Вход временно недоступен: подключение к Supabase не настроено для этого окружения.";
  }

  const redirectTo = new URL("/auth/callback", window.location.origin).toString();
  const authorizeUrl = new URL("/auth/v1/authorize", base);
  authorizeUrl.searchParams.set("provider", "google");
  authorizeUrl.searchParams.set("redirect_to", redirectTo);
  authorizeUrl.searchParams.set("apikey", key);

  window.location.assign(authorizeUrl.toString());
  return null;
}
