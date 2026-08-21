import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Общая шапка сайта. Умеет видеть состояние входа:
 * для гостя — «Войти / Создать аккаунт»,
 * для вошедшего — «Карта» и «Профиль» (больше не путаем пользователя
 * предложением регистрироваться повторно).
 */
export default async function SiteHeader() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    signedIn = false;
  }

  return (
    <header className="mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
      <Link href="/" className="flex items-center gap-3 font-black tracking-tight">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sm text-white">L</span>
        <span>Luma</span>
      </Link>
      <nav className="flex items-center gap-5 text-sm font-bold text-slate-600">
        {signedIn ? (
          <>
            <Link href="/map" className="hover:text-ink">Карта</Link>
            <Link href="/profile" className="rounded-full bg-tide px-4 py-2 text-ink hover:shadow-glow">Профиль</Link>
          </>
        ) : (
          <>
            <Link href="/auth" className="hover:text-ink">Войти</Link>
            <Link href="/auth?mode=signup" className="rounded-full bg-tide px-4 py-2 text-ink hover:shadow-glow">Создать аккаунт</Link>
          </>
        )}
      </nav>
    </header>
  );
}
