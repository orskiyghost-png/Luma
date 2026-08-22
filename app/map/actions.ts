"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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