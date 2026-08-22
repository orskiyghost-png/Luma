import { createClient } from "@/lib/supabase/server";

/**
 * Серверная проверка Cloudflare Turnstile.
 * Если ключ не задан (TURNSTILE_SECRET_KEY пуст), капча считается пройденной —
 * это позволяет включить защиту позже, добавив ключи, без переписывания кода.
 */
export async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // капча не настроена — не блокируем
  if (!token) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await response.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

/** Настроена ли капча (есть ли публичный ключ для показа виджета). */
export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

/**
 * Проверяет ограничение частоты действия текущего пользователя.
 * Возвращает true, если действие разрешено.
 */
export async function checkRateLimit(
  action: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_action: action,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  // При ошибке связи не блокируем пользователя полностью — пропускаем действие,
  // остальные проверки (RLS, валидация) остаются в силе.
  if (error) return true;
  return data === true;
}
