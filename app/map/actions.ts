"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security";
import { CATEGORY_TTL, DEFAULT_TTL_HOURS } from "@/lib/markers";

export type MarkerRow = {
  id: string;
  author_id: string;
  lat: number;
  lng: number;
  category: string;
  text: string;
  expires_at: string;
  created_at: string;
};

export type MarkerActionResult = { error: string } | { ok: true };

/** Набор доступных реакций на метку. */
export const REACTION_TYPES = ["👍", "❤️", "⚠️", "🙏", "👀"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export type ReactionSummary = {
  counts: Record<string, number>;
  mine: string[];
};

/** Реакции по одной метке: сколько какого типа и что поставил я. */
export async function getMarkerReactions(markerId: string): Promise<ReactionSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("reactions")
    .select("type, user_id")
    .eq("target_type", "marker")
    .eq("target_id", markerId);

  const counts: Record<string, number> = {};
  const mine: string[] = [];
  for (const row of (data as { type: string; user_id: string }[] | null) ?? []) {
    counts[row.type] = (counts[row.type] ?? 0) + 1;
    if (user && row.user_id === user.id) mine.push(row.type);
  }
  return { counts, mine };
}

/** Переключает реакцию текущего пользователя на метку. */
export async function toggleReaction(
  markerId: string,
  type: string,
): Promise<{ error: string } | ReactionSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нужно войти в аккаунт." };
  if (!REACTION_TYPES.includes(type as ReactionType)) return { error: "Неизвестная реакция." };

  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("target_type", "marker")
    .eq("target_id", markerId)
    .eq("user_id", user.id)
    .eq("type", type)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("reactions").delete().eq("id", existing.id);
    if (error) return { error: "Не удалось убрать реакцию." };
  } else {
    const { error } = await supabase.from("reactions").insert({
      target_type: "marker",
      target_id: markerId,
      user_id: user.id,
      type,
    });
    if (error) return { error: "Не удалось поставить реакцию." };
  }

  return getMarkerReactions(markerId);
}

export async function saveCurrentLocation(lat: number, lng: number): Promise<MarkerActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нужно войти в аккаунт." };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { error: "Получены некорректные координаты." };
  }

  // Координаты сохраняются только в личной строке пользователя.
  // sharing_enabled=false по умолчанию, поэтому другим они не видны.
  const { error } = await supabase.from("live_locations").upsert({
    user_id: user.id,
    lat,
    lng,
    sharing_enabled: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) return { error: "Место определено, но сохранить его не удалось." };
  return { ok: true };
}

export async function addMarker(
  lat: number,
  lng: number,
  category: string,
  text: string,
): Promise<MarkerActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нужно войти в аккаунт." };

  const trimmed = text.trim().slice(0, 280);
  if (!trimmed) return { error: "Напишите текст заметки." };

  // Антиспам: не больше 5 меток в минуту на пользователя.
  const allowed = await checkRateLimit("create_marker", 5, 60);
  if (!allowed) return { error: "Слишком много меток подряд. Подождите минуту." };

  const ttlHours = CATEGORY_TTL[category] ?? DEFAULT_TTL_HOURS;
  const expiresAt = new Date(Date.now() + ttlHours * 3600_000).toISOString();

  const { error } = await supabase.from("markers").insert({
    author_id: user.id,
    lat,
    lng,
    category,
    text: trimmed,
    expires_at: expiresAt,
  });

  if (error) return { error: "Не удалось создать метку. Попробуйте ещё раз." };

  revalidatePath("/map");
  return { ok: true };
}

export async function deleteMarker(markerId: string): Promise<MarkerActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нужно войти в аккаунт." };

  // Мягкое удаление — владелец может убрать только свою метку.
  const { error } = await supabase
    .from("markers")
    .update({ deleted: true })
    .eq("id", markerId)
    .eq("author_id", user.id);

  if (error) return { error: "Не удалось удалить метку." };

  revalidatePath("/map");
  return { ok: true };
}

/** Загружает активные (не истёкшие, не удалённые) метки. */
export async function getActiveMarkers(): Promise<MarkerRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("markers")
    .select("*")
    .eq("deleted", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return (data as MarkerRow[]) ?? [];
}