import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/site-header";
import { signOut } from "@/app/auth/actions";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?returnTo=/profile");

  const { data: profile } = await supabase.from("profiles").select("display_name, bio, city, city_visible, avatar_url, avatar_full_url, role").eq("user_id", user.id).maybeSingle();
  const isStaff = profile?.role === "admin" || profile?.role === "moderator";

  // Если имени в профиле ещё нет — берём его из метаданных аккаунта
  // (например, из Google-профиля), а не показываем «Без имени».
  const metadata = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const fallbackName =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata.name === "string" && metadata.name.trim()) ||
    user.email?.split("@")[0] ||
    "друг";

  // «Без имени» — дефолт из миграции БД; считаем его отсутствующим именем.
  const displayName =
    profile?.display_name && profile.display_name !== "Без имени"
      ? profile.display_name
      : fallbackName;

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-black uppercase tracking-[0.18em] text-tide">Личный профиль</p><h1 className="mt-2 text-4xl font-black tracking-tight">Привет, {displayName}.</h1><p className="mt-2 text-slate-500">Здесь ты управляешь тем, чем хочешь делиться.</p></div>
        <div className="flex items-center gap-3"><Link href="/map" className="primary-button">Открыть карту</Link><Link href="/messages" className="secondary-button">Сообщения</Link>{isStaff && <Link href="/admin" className="secondary-button">Модерация</Link>}<Link href="/" className="secondary-button">На главную</Link><form action={signOut}><button className="text-sm font-bold text-slate-500 hover:text-ink" type="submit">Выйти</button></form></div>
      </div>
      <section className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <aside className="rounded-3xl bg-ink p-6 text-white shadow-glow"><div className="grid h-20 w-20 place-items-center rounded-2xl bg-tide text-3xl font-black text-ink">{(displayName).slice(0, 1).toUpperCase()}</div><p className="mt-7 text-xs font-black uppercase tracking-[0.16em] text-white/50">Аккаунт</p><p className="mt-2 break-all text-sm text-white/80">{user.email}</p><div className="mt-8 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-white/70">Показ живой позиции сейчас выключен. Когда дойдём до этой функции, она останется добровольной и будет доступна только подтверждённым 18+.</div></aside>
        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-black tracking-tight">Данные профиля</h2><p className="mt-2 mb-7 text-sm leading-6 text-slate-500">Эти данные можно будет изменить в любой момент. Город показывается только при включённом переключателе.</p><ProfileForm profile={profile} /></section>
      </section>
      </div>
    </main>
  );
}
