import { createBrowserClient } from "@supabase/ssr";

/**
 * Приводит адрес Supabase к каноническому виду.
 * Защищает от типичных опечаток в переменной окружения:
 * - лишний слэш в конце;
 * - случайно добавленный путь /auth/v1.
 */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/auth\/v1$/, "");
}

export function createClient() {
  return createBrowserClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
