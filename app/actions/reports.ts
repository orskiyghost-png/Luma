"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security";
import { REPORT_REASONS, type ReportTargetType } from "@/lib/reports";

/**
 * Отправляет жалобу через серверную функцию submit_report (валидация,
 * анти-дубликаты в пределах суток). Дополнительно ограничивает частоту.
 */
export async function submitReport(
  targetType: ReportTargetType,
  targetId: string,
  reasonCode: string,
  details: string,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нужно войти в аккаунт." };

  const allowed = await checkRateLimit("submit_report", 10, 3600);
  if (!allowed) return { error: "Слишком много жалоб подряд. Попробуйте позже." };

  const reasonLabel = REPORT_REASONS.find((r) => r.code === reasonCode)?.label ?? "Другое";
  const reason = details.trim()
    ? `${reasonLabel}: ${details.trim().slice(0, 1800)}`
    : reasonLabel;

  const { data, error } = await supabase.rpc("submit_report", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
  });

  if (error) return { error: "Не удалось отправить жалобу." };

  switch (data) {
    case "ok":
      return { ok: true };
    case "duplicate":
      return { error: "Вы уже жаловались на это за последние сутки." };
    case "self":
      return { error: "Нельзя пожаловаться на самого себя." };
    case "empty_reason":
      return { error: "Опишите причину жалобы." };
    default:
      return { error: "Не удалось отправить жалобу." };
  }
}
