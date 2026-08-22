import Link from "next/link";
import SiteHeader from "@/components/site-header";

const principles = [
  {
    number: "01",
    title: "Замечай важное",
    text: "Короткие заметки на карте помогают делиться обстановкой вокруг, не превращая город в бесконечную ленту.",
    detail: "У заметок есть категория и срок жизни. Когда информация теряет актуальность, она исчезает сама и не захламляет пространство.",
    icon: "✦",
  },
  {
    number: "02",
    title: "Общайся осознанно",
    text: "Личные сообщения строятся на взаимном согласии, а не на случайном поиске людей рядом.",
    detail: "Пользователь сам решает, с кем начинать диалог. Запрос можно принять, отклонить или заблокировать.",
    icon: "↗",
  },
  {
    number: "03",
    title: "Контроль всегда у тебя",
    text: "Показ живой позиции выключен по умолчанию и доступен только подтверждённым пользователям 18+.",
    detail: "Настройку приватности можно изменить в профиле в любой момент. Мы не включаем геопозицию скрытно.",
    icon: "⌁",
  },
];

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="aurora aurora-one" aria-hidden="true" />
      <div className="aurora aurora-two" aria-hidden="true" />
      <div className="aurora aurora-three" aria-hidden="true" />
      <div className="page-content">
        <SiteHeader />

        <section className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.03fr_0.97fr] lg:gap-20 lg:py-24">
          <div>
            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)] shadow-[var(--shadow-sm)] backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_0_5px_rgba(123,231,210,.14)]" />
              Карта для настоящей жизни
            </div>
            <h1 className="max-w-3xl text-[clamp(2.8rem,7vw,5.8rem)] font-black leading-[0.98] tracking-[-0.07em] text-[var(--text)]">
              Город становится понятнее, когда люди делятся <span className="text-[var(--accent)]">важным.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--text-soft)] sm:text-xl">
              Luma соединяет карту, короткие заметки и спокойное общение. Сначала безопасность и согласие — потом всё остальное.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/auth?mode=signup" className="primary-button px-5">Начать бесплатно <ArrowIcon /></Link>
              <Link href="/auth" className="secondary-button px-5">Уже есть аккаунт</Link>
            </div>
            <div className="mt-12 flex max-w-md items-center gap-4 text-sm leading-6 text-[var(--text-muted)]">
              <div className="flex -space-x-2" aria-hidden="true">
                {[["#7be7d2", "Л"], ["#9aaeff", "М"], ["#f2b394", "А"]].map(([color, letter]) => <span key={letter} className="grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--bg)] text-xs font-black text-[#10212b]" style={{ background: color }}>{letter}</span>)}
              </div>
              <span>Простые правила. Понятный контроль. Никаких сюрпризов.</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[31rem]">
            <div className="absolute -inset-10 rounded-[4rem] bg-[rgba(123,231,210,.12)] blur-3xl" aria-hidden="true" />
            <div className="glass-panel relative p-3 sm:p-4">
              <div className="overflow-hidden rounded-[21px] border border-white/10 bg-[#0d1b2a] p-5 text-white shadow-2xl sm:p-6">
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div><div className="text-sm font-bold text-white/90">Твоя карта</div><div className="mt-1 text-xs text-white/45">Вокруг становится понятнее</div></div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.08] px-3 py-1.5 text-xs font-bold text-white/70"><span className="h-1.5 w-1.5 rounded-full bg-[#7be7d2]" />В сети</span>
                </div>
                <div className="relative h-[22rem] overflow-hidden rounded-[20px] border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(123,231,210,.28),transparent_33%),linear-gradient(135deg,#19344a,#0b1727)]">
                  <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)", backgroundSize: "52px 52px" }} />
                  <span className="absolute left-[24%] top-[31%] h-4 w-4 rounded-full border-4 border-[#7be7d2] bg-white shadow-[0_0_0_8px_rgba(123,231,210,.16)]" />
                  <span className="absolute right-[24%] top-[51%] h-4 w-4 rounded-full border-4 border-[#f2b394] bg-white shadow-[0_0_0_8px_rgba(242,179,148,.18)]" />
                  <span className="absolute bottom-[24%] left-[45%] h-3 w-3 rounded-full bg-white/70 shadow-[0_0_0_6px_rgba(255,255,255,.08)]" />
                  <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-[#10283a]/75 p-4 backdrop-blur-xl"><div className="text-xs text-white/45">Рядом с тобой</div><div className="mt-1 text-sm font-bold">3 свежие заметки на карте</div></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[.07] p-4"><div className="text-xs text-white/45">Приватность</div><div className="mt-1 text-sm font-bold text-[#7be7d2]">Под контролем</div></div>
                  <div className="rounded-2xl border border-white/10 bg-white/[.07] p-4"><div className="text-xs text-white/45">Показ позиции</div><div className="mt-1 text-sm font-bold">Выключен</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8" aria-labelledby="principles-title">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Наши принципы</p><h2 id="principles-title" className="mt-3 text-3xl font-black tracking-[-0.05em] sm:text-4xl">Ближе к жизни. Тише в интерфейсе.</h2></div><p className="max-w-sm text-sm leading-6 text-[var(--text-muted)]">Каждый элемент Luma оставляет тебе пространство для решения, а не подталкивает к нему.</p></div>
          <div className="grid gap-3 md:grid-cols-3">
            {principles.map((item) => <details key={item.number} className="glass-panel group p-5" open={item.number === "01"}><summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-4"><span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-lg text-[var(--accent)]">{item.icon}</span><span className="font-mono text-xs font-bold text-[var(--text-muted)]">{item.number}</span></div><h3 className="mt-8 text-lg font-black">{item.title}</h3><p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{item.text}</p><span className="mt-5 inline-block text-xs font-bold text-[var(--accent)] group-open:hidden">Подробнее</span></summary><p className="mt-5 border-t border-[var(--line)] pt-5 text-sm leading-6 text-[var(--text-soft)]">{item.detail}</p></details>)}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]" aria-labelledby="about-title">
          <div className="glass-panel flex min-h-[18rem] flex-col justify-between p-7 sm:p-9"><p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent)]">О Luma</p><div><h2 id="about-title" className="max-w-md text-3xl font-black tracking-[-0.05em]">Технология, которая не перекрикивает город.</h2><p className="mt-4 max-w-md text-sm leading-7 text-[var(--text-soft)]">Мы создаём место для коротких сигналов, полезных встреч и ясных границ. Меньше шума — больше присутствия.</p></div></div>
          <div className="glass-panel grid gap-6 p-7 sm:grid-cols-3 sm:p-9"><div><p className="text-3xl font-black text-[var(--accent)]">01</p><p className="mt-3 text-sm font-bold">Только нужное</p><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Заметки живут ровно столько, сколько полезны.</p></div><div><p className="text-3xl font-black text-[var(--accent)]">18+</p><p className="mt-3 text-sm font-bold">Осознанный доступ</p><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Живая позиция всегда выключена сначала.</p></div><div><p className="text-3xl font-black text-[var(--accent)]">∞</p><p className="mt-3 text-sm font-bold">Твой выбор</p><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Настройки приватности остаются у тебя.</p></div></div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8"><div className="relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(123,231,210,.16),var(--surface))] p-8 shadow-[var(--shadow-md)] sm:p-12"><div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[rgba(123,231,210,.16)] blur-3xl" aria-hidden="true" /><div className="relative max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Первый шаг</p><h2 className="mt-3 text-3xl font-black tracking-[-0.05em] sm:text-4xl">Пусть карта работает на тебя.</h2><p className="mt-4 max-w-xl leading-7 text-[var(--text-soft)]">Создай аккаунт бесплатно и начни оставлять только те сигналы, которые действительно важны.</p><Link href="/auth?mode=signup" className="primary-button mt-7">Создать аккаунт <ArrowIcon /></Link></div></div></section>

        <footer className="mx-auto flex max-w-6xl flex-col gap-5 border-t border-[var(--line)] px-5 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8"><div><span className="font-black text-[var(--text)]">Luma<span className="text-[var(--accent)]">.</span></span><span className="ml-3">Карта живых заметок</span></div><nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Ссылки в подвале"><Link href="/pricing" className="hover:text-[var(--text)]">Тарифы</Link><Link href="/legal/privacy" className="hover:text-[var(--text)]">Поддержка и приватность</Link><Link href="/legal/terms" className="hover:text-[var(--text)]">Пользовательское соглашение</Link></nav><span>© 2026 Luma</span></footer>
      </div>
    </main>
  );
}
