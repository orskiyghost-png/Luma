import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function Icon({ name }: { name: "map" | "user" | "price" | "login" | "arrow" }) {
  const paths = {
    map: <><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
    price: <><path d="M20 12V4H4v16h16v-4"/><path d="M8 9h8M8 13h5"/></>,
    login: <><path d="M14 4h6v16h-6"/><path d="M10 8l4 4-4 4M3 12h11"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  }[name];
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">{paths}</svg>;
}

export default async function SiteHeader() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch { signedIn = false; }

  const linkClass = "inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)]";
  const primaryClass = "inline-flex min-h-10 items-center gap-2 rounded-xl border border-[rgba(123,231,210,.5)] bg-[var(--tide)] px-4 text-sm font-extrabold text-[#06211f] shadow-[0_10px_26px_rgba(123,231,210,.16)] transition hover:shadow-[0_14px_34px_rgba(123,231,210,.25)]";

  return (
    <header className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-8">
      <Link href="/" className="group inline-flex items-center gap-3" aria-label="Luma — на главную">
        <span className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/15 bg-white/[.07] text-sm font-black tracking-tight text-[var(--tide)] shadow-[0_8px_24px_rgba(0,0,0,.18)] transition group-hover:border-[var(--tide)]">L</span>
        <span className="text-[1.25rem] font-extrabold tracking-[-.04em] text-[var(--text-primary)]">Luma<span className="text-[var(--tide)]">.</span></span>
      </Link>
      <nav className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[.035] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,.18)] backdrop-blur-xl" aria-label="Основная навигация">
        {signedIn ? (
          <>
            <Link href="/map" className={linkClass}><Icon name="map" /><span className="hidden sm:inline">Карта</span></Link>
            <Link href="/profile" className={primaryClass}><Icon name="user" /><span>Профиль</span></Link>
            <Link href="/pricing" className={linkClass}><Icon name="price" /><span className="hidden sm:inline">Тарифы</span></Link>
          </>
        ) : (
          <>
            <Link href="/pricing" className={linkClass}><Icon name="price" /><span className="hidden sm:inline">Тарифы</span></Link>
            <Link href="/auth" className={linkClass}><Icon name="login" /><span>Войти</span></Link>
            <Link href="/auth?mode=signup" className={primaryClass}><span>Создать аккаунт</span><Icon name="arrow" /></Link>
          </>
        )}
      </nav>
    </header>
  );
}
