"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** TTL категорий (в часах). Обоснование: актуальность события. */
const CATEGORY_TTL: Record<string, number> = {
  dtp: 4,       // ДТП: актуально пока пробка/авария
  police: 2,    // Полиция: экипажи быстро уезжают
  hangout: 6,   // Гуляем: прогулка/вечеринка длится несколько часов
  other: 12,    // Своя категория: средний срок
};

const DEFAULT_TTL_HOURS = 12;

/** Категории, доступные пользователю. */
export const CATEGORIES = [
  { id: "dtp", label: "🚗 ДТП", ttlHours: 4 },
  { id: "police", label: "🚔 Полиция", ttlHours: 2 },
  { id: "hangout", label: "🎉 Гуляем", ttlHours: 6 },
  { id: "other", label: "📌 Другое", ttlHours: 12 },
] as const;

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