import { NextResponse } from "next/server";

/**
 * Временный диагностический эндпоинт Фазы 2.
 * Помогает понять, почему вход не работает, НЕ раскрывая секретов:
 * показывает только форму адреса (хост, лишний путь) и коды ответов Supabase.
 * Убрать перед публичным запуском (Фаза 12).
 */
export async function GET() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  let trimmed = raw.trim().replace(/\/+$/, "").replace(/\/auth\/v1$/, "");
  try {
    const parsed = new URL(trimmed);
    trimmed = `${parsed.protocol}//${parsed.host}`;
  } catch {
    // оставляем как есть — форма адреса будет видна в отчёте ниже
  }

  let host = "";
  let extraPath: string | null = null;
  try {
    const parsed = new URL(trimmed);
    host = parsed.host;
    if (parsed.pathname && parsed.pathname !== "/") extraPath = parsed.pathname;
  } catch {
    host = "(не является корректным URL)";
  }

  const result: Record<string, unknown> = {
    urlPresent: raw.length > 0,
    urlValidShape: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(trimmed),
    host,
    extraPath,
    hadTrailingSlash: /\/$/.test(raw),
    hadAuthV1Suffix: /auth\/v1\/?$/.test(raw),
    hadQuotesOrSpaces: raw !== raw.trim() || /^["']|["']$/.test(raw),
    keyPresent: key.length > 0,
    keyLooksLikeJwt: key.startsWith("ey"),
    keyLength: key.length,
    // Только факт наличия сервисного ключа (нужен для авто-подтверждения email в dev).
    serviceKeyPresent: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0,
    // Только факт наличия ключа карт (Фаза 3).
    mapTilerKeyPresent: (process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "").length > 0,
  };

  if (trimmed && key) {
    try {
      // Проверяем связку «адрес + ключ»: правильная конфигурация вернёт
      // 400 с "Invalid login credentials" — это означает, что путь и ключ в порядке.
      const probe = await fetch(`${trimmed}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: key,
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          email: "probe@luma-check.invalid",
          password: "wrong-password-123",
        }),
      });
      const body = (await probe.json().catch(() => ({}))) as { error?: string; msg?: string; message?: string };
      result.emailProbeStatus = probe.status;
      result.emailProbeError = body.error ?? body.msg ?? body.message ?? null;
    } catch (error) {
      result.emailProbeError = String(error).slice(0, 200);
    }

    try {
      // Проверяем, включён ли Google-провайдер: ожидаем 302 на accounts.google.com.
      const google = await fetch(
        `${trimmed}/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fexample.com%2Fauth%2Fcallback&apikey=${encodeURIComponent(key)}`,
        { redirect: "manual" },
      );
      result.googleProbeStatus = google.status;
      result.googleRedirectsTo = google.headers.get("location")?.split("?")[0]?.slice(0, 80) ?? null;
    } catch (error) {
      result.googleProbeError = String(error).slice(0, 200);
    }
  }

  return NextResponse.json(result);
}
