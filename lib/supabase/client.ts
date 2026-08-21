import { createBrowserClient } from "@supabase/ssr";

/**
 * Приводит адрес Supabase к каноническому виду — только схема и хост.
 * Защищает от типичных ошибок в переменной окружения:
 * - лишний слэш в конце;
 * - случайно скопированный путь вроде /rest/v1 или /auth/v1.
 */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const parsed = new URL(raw.trim());
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return raw.trim().replace(/\/+$/, "");
  }
}

export function createClient() {
  return createBrowserClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Google-вход возвращает сессию в хэше адреса (#access_token=...).
      // Библиотека по умолчанию ждёт PKCE-код (?code=...) и игнорирует хэш,
      // поэтому явно включаем implicit-поток.
      auth: { flowType: "implicit" },
    },
  );
}
