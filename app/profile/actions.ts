"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error: string | null; success: string | null };

export async function updateProfile(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?returnTo=/profile");

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim() || null;
  const avatarFullUrl = String(formData.get("avatarFullUrl") ?? "").trim() || null;
  const cityVisible = formData.get("cityVisible") === "on";

  if (displayName.length < 2 || displayName.length > 80) return { error: "Имя должно быть от 2 до 80 символов.", success: null };
  if (bio.length > 500) return { error: "Описание не должно быть длиннее 500 символов.", success: null };

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    display_name: displayName,
    bio: bio || null,
    city: city || null,
    city_visible: cityVisible,
    avatar_url: avatarUrl,
    avatar_full_url: avatarFullUrl,
  }, { onConflict: "user_id" });

  if (error) return { error: "Не удалось сохранить профиль. Попробуйте ещё раз.", success: null };
  return { error: null, success: "Профиль сохранён." };
}
