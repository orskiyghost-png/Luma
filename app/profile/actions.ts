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
    .select("user_id, stripe_customer_id, is_pro")
    .maybeSingle();

  let error = updated.error;
  if (!error && !updated.data) {
    const inserted = await supabase
      .from("profiles")
      .insert({ user_id: user.id, ...profileData })
      .select("user_id, stripe_customer_id, is_pro")
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

/**
 * Подтверждение 18+ (простое, без документов — как в ТЗ Фазы 8).
 * Требует явного согласия-чекбокса. Если в аккаунте есть дата рождения,
 * дополнительно проверяем, что пользователю действительно ≥18 лет.
 * RLS профиля разрешает поднять age_verified_adult с false на true,
 * но не позволяет снять его самому — снятие делает только модерация.
 */
export async function confirmAdult(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?returnTo=/profile");

  if (formData.get("confirm") !== "on") {
    return { error: "Отметьте подтверждение, что вам исполнилось 18 лет.", success: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("date_of_birth")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.date_of_birth) {
    const dob = new Date(profile.date_of_birth);
    const eighteen = new Date();
    eighteen.setFullYear(eighteen.getFullYear() - 18);
    if (dob > eighteen) {
      return { error: "По дате рождения в аккаунте вам ещё нет 18 лет.", success: null };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ age_verified_adult: true })
    .eq("user_id", user.id);

  if (error) {
    console.error("Adult confirm failed", { code: error.code, message: error.message });
    return { error: "Не удалось сохранить подтверждение. Попробуйте позже.", success: null };
  }

  revalidatePath("/profile");
  return { error: null, success: "Возраст 18+ подтверждён." };
}

/**
 * Включает/выключает показ своей живой геопозиции на карте (opt-in).
 * Включить можно только подтверждённым 18+ — это дополнительно
 * гарантируется RLS-политикой live_locations. Выключить можно всегда.
 */
export async function setLocationSharing(
  enabled: boolean,
  lat?: number,
  lng?: number,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нужно войти в аккаунт." };

  if (enabled) {
    if (typeof lat !== "number" || typeof lng !== "number") {
      return { error: "Не удалось определить местоположение." };
    }
    const { error } = await supabase
      .from("live_locations")
      .upsert({ user_id: user.id, lat, lng, sharing_enabled: true });
    if (error) {
      // 42501 — RLS отклонил: пользователь не подтвердил 18+.
      if (error.code === "42501") {
        return { error: "Показ себя на карте доступен только после подтверждения 18+." };
      }
      return { error: "Не удалось включить показ на карте." };
    }
  } else {
    const { error } = await supabase
      .from("live_locations")
      .update({ sharing_enabled: false })
      .eq("user_id", user.id);
    if (error) return { error: "Не удалось выключить показ на карте." };
  }

  revalidatePath("/profile");
  revalidatePath("/map");
  return { ok: true };
}
