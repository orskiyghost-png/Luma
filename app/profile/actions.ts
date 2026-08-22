"use server";

import { revalidatePath } from "next/cache";
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

  const profileData = {
    display_name: displayName,
    bio: bio || null,
    city: city || null,
    city_visible: cityVisible,
    avatar_url: avatarUrl,
    avatar_full_url: avatarFullUrl,
  };

  // Профиль обычно создаёт trigger после регистрации. Обновляем его напрямую,
  // чтобы RLS не требовал лишнего INSERT при каждом сохранении.
  const updated = await supabase
    .from("profiles")
    .update(profileData)
    .eq("user_id", user.id)
    .select("user_id")
    .maybeSingle();

  let error = updated.error;
  if (!error && !updated.data) {
    const inserted = await supabase
      .from("profiles")
      .insert({ user_id: user.id, ...profileData })
      .select("user_id")
      .maybeSingle();
    error = inserted.error;
  }

  if (error) {
    // В логах сохраняем только код/сообщение Supabase, без email, токенов и
    // других секретов; пользователю показываем понятную причину.
    console.error("Profile save failed", { code: error.code, message: error.message });
    if (error.code === "42501") {
      return { error: "База данных пока не разрешает менять профиль. Нужно обновить миграцию профиля.", success: null };
    }
    if (error.code === "42P01") {
      return { error: "Таблица профиля ещё не создана в Supabase. Нужно применить миграцию профиля.", success: null };
    }
    return { error: `Не удалось сохранить профиль (${error.code}). Проверьте миграцию Supabase.`, success: null };
  }

  revalidatePath("/profile");
  return { error: null, success: "Профиль сохранён." };
}
