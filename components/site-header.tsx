import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type IconName = "map" | "user" | "price" | "login" | "arrow";

function Icon({ name }: { name: IconName }) {
  const paths = {
    map: <><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" /><path d="M9 3v15M15 6v15" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    price: <><path d="M20 12V4H4v16h16v-4" /><path d="M8 9h8M8 13h5" /></>,
    login: <><path d="M14 4h6v16h-6" /><path d="M10 8l4 4-4 4M3 12h11" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  }[name];

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      {paths}
    </svg>
  );
}

export default async function SiteHeader() {
  let signedIn = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      signedIn = Boolean(user);
    } catch {
      signedIn = false;
    }
  }
  if (!isSupabaseConfigured()) {
    signedIn = false;
  }

  return (
    <header className="site-header">
      <div className="site-nav">
        <Link href="/" className="group inline-flex shrink-0 items-center gap-3" aria-label="Luma — на главную">
          <span className="brand-mark">L</span>
          <span className="brand-name text-[1.2rem]">Luma<span className="text-[var(--accent)]">.</span></span>
        </Link>

        <nav className="site-nav-links" aria-label="Основная навигация">
          {signedIn ? (
            <>
              <Link href="/map" className="ghost-button px-3 text-sm"><Icon name="map" /><span className="hide-mobile">Карта</span></Link>
              <Link href="/profile" className="primary-button px-3 text-sm"><Icon name="user" /><span>Профиль</span></Link>
              <Link href="/pricing" className="ghost-button hide-mobile px-3 text-sm"><Icon name="price" /><span>Тарифы</span></Link>
            </>
          ) : (
            <>
              <Link href="/pricing" className="ghost-button hide-mobile px-3 text-sm"><Icon name="price" /><span>Тарифы</span></Link>
              <Link href="/auth" className="ghost-button px-3 text-sm"><Icon name="login" /><span>Войти</span></Link>
              <Link href="/auth?mode=signup" className="primary-button px-3 text-sm"><span className="hide-mobile">Создать аккаунт</span><span className="sm:hidden">Регистрация</span><Icon name="arrow" /></Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
