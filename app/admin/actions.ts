"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReportItem = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  target_summary: string | null;
  target_author: string | null;
};

/** Проверяет, что текущий пользователь — модератор или админ. */
export async function getStaffRole(): Promise<"admin" | "moderator" | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  const role = (data?.role ?? "user") as string;
  return role === "admin" || role === "moderator" ? role : null;
}

export async function listReports(status: string): Promise<ReportItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_reports", { p_status: status });
  if (error) return [];
  return (data as ReportItem[]) ?? [];
}

export async function setReportStatus(reportId: string, status: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_report_status", {
    p_report_id: reportId,
    p_status: status,
  });
  if (error) return { error: "Нет доступа или ошибка." };
  if (data !== "ok") return { error: "Не удалось обновить." };
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function deleteMarkerAsStaff(markerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_marker", { p_marker_id: markerId });
  if (error || data !== "ok") return { error: "Не удалось удалить метку." };
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function setUserBan(userId: string, banned: boolean) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_ban", {
    p_user_id: userId,
    p_banned: banned,
  });
  if (error) return { error: "Нет доступа или ошибка." };
  if (data === "cannot_ban_admin") return { error: "Нельзя забанить администратора." };
  if (data !== "ok") return { error: "Не удалось изменить статус." };
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function setUserRole(userId: string, role: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_role", {
    p_user_id: userId,
    p_role: role,
  });
  if (error) return { error: "Только администратор может менять роли." };
  if (data !== "ok") return { error: "Не удалось изменить роль." };
  revalidatePath("/admin");
  return { ok: true as const };
}
