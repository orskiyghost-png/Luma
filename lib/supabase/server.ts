import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

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

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies; middleware refreshes sessions.
          }
        },
      },
    },
  );
}
