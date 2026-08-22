import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/site-header";
import { signOut } from "@/app/auth/actions";
import { ProfileForm } from "./profile-form";
import { SafetySettings } from "./safety-settings";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?returnTo=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, city, city_visible, avatar_url, avatar_full_url, role, age_verified_adult")
    .eq("user_id", user.id)
    .maybeSingle();
  const isStaff = profile?.role === "admin" || profile?.role === "moderator";

  const { data: liveLoc } = await supabase
    .from("live_locations")
    .select("sharing_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  const metadata = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const fallbackName =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata.name === "string" && metadata.name.trim()) ||
    user.email?.split("@")[0] ||
    "друг";
  const displayName = profile?.display_name && profile.display_name !== "Без имени"
    ? profile.display_name
    : fallbackName;

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow text-tide">Личный профиль</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Привет, {displayName}.</h1>
            <p className="mt-3 max-w-xl text-[var(--text-soft)]">Настрой, чем хочешь делиться на карте и в профиле.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/map" className="primary-button">Открыть карту</Link>
            {isStaff && <Link href="/admin" className="ghost-button">Модерация</Link>}
            <form action={signOut}>
              <button className="ghost-button" type="submit">Выйти</button>
            </form>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="glass-panel p-6 sm:p-7">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--accent)] text-2xl font-black text-[var(--accent-ink)]">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <p className="mt-7 text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Аккаунт</p>
            <p className="mt-2 break-all text-sm text-[var(--text-soft)]">{user.email}</p>
            <div className="mt-7 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--text-soft)]">
              {profile?.age_verified_adult
                ? "Возраст 18+ подтверждён. Показ живой позиции включается только по вашему выбору."
                : "Показ живой позиции выключен. Сначала подтвердите 18+, если захотите включить эту функцию."}
            </div>
          </aside>

          <section className="glass-panel p-6 sm:p-8">
            <h2 className="text-2xl font-black tracking-tight">Данные профиля</h2>
            <p className="mt-2 mb-7 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
              Эти данные можно изменить в любой момент. Город виден другим только при включённой настройке.
            </p>
            <ProfileForm profile={profile} />
          </section>
        </section>

        <div className="mt-5">
          <SafetySettings
            ageVerifiedAdult={profile?.age_verified_adult ?? false}
            sharingEnabled={liveLoc?.sharing_enabled ?? false}
          />
        </div>

        <p className="mt-8 text-center text-xs text-[var(--text-muted)]">
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-[var(--text)]">Политика конфиденциальности</Link>
          <span className="mx-2">·</span>
          <Link href="/legal/terms" className="underline underline-offset-2 hover:text-[var(--text)]">Пользовательское соглашение</Link>
        </p>
      </div>
    </main>
  );
}
