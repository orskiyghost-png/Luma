import Link from "next/link";

const highlights = [
  ["01", "Замечай важное", "Метки на карте помогают делиться обстановкой вокруг — без публикации домашнего адреса."],
  ["02", "Общайся осознанно", "Личные сообщения строятся на взаимном согласии, а не на случайном поиске людей рядом."],
  ["03", "Контроль всегда у тебя", "Показ живой позиции выключен по умолчанию и доступен только подтверждённым 18+ пользователям."],
];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
            <span className="h-2 w-2 rounded-full bg-tide" /> Карта для настоящей жизни
          </p>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.06em] text-ink sm:text-7xl">
            Город становится понятнее, когда люди делятся <span className="text-tide">важным.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            Luma соединяет карту, короткие заметки и спокойное общение. Сначала безопасность и согласие — потом всё остальное.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/auth?mode=signup" className="primary-button">Начать бесплатно <span className="ml-2">→</span></Link>
            <Link href="/auth" className="secondary-button">У меня уже есть аккаунт</Link>
          </div>
          <div className="mt-12 flex items-center gap-4 text-sm text-slate-500">
            <div className="flex -space-x-2">
              {['#27b99a', '#ff8066', '#8da1c5'].map((color) => <span key={color} className="h-9 w-9 rounded-full border-2 border-[#f5f8f4]" style={{ background: color }} />)}
            </div>
            <span>Простые правила. Понятный контроль. Никаких сюрпризов.</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-8 rounded-[3rem] bg-tide/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] bg-ink p-4 shadow-glow">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#102238] p-5 text-white">
              <div className="mb-10 flex items-center justify-between text-sm text-white/60"><span>Твоя карта</span><span className="rounded-full bg-white/10 px-3 py-1">● онлайн</span></div>
              <div className="relative h-72 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_35%,rgba(39,185,154,.35),transparent_32%),linear-gradient(135deg,#142b43,#0b1729)]">
                <span className="absolute left-[25%] top-[32%] h-4 w-4 rounded-full border-4 border-tide bg-white shadow-[0_0_0_8px_rgba(39,185,154,.18)]" />
                <span className="absolute right-[24%] top-[52%] h-4 w-4 rounded-full border-4 border-coral bg-white shadow-[0_0_0_8px_rgba(255,128,102,.2)]" />
                <span className="absolute bottom-[20%] left-[46%] h-3 w-3 rounded-full bg-white/70" />
                <div className="absolute inset-x-5 bottom-5 rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur"><div className="text-xs text-white/50">Около тебя</div><div className="mt-1 font-bold">3 свежие заметки на карте</div></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/10 p-3"><div className="text-xs text-white/50">Безопасность</div><div className="mt-1 font-bold text-tide">Под контролем</div></div><div className="rounded-xl bg-white/10 p-3"><div className="text-xs text-white/50">Показ позиции</div><div className="mt-1 font-bold">Выключен</div></div></div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <div className="grid gap-4 border-t border-slate-200 pt-8 md:grid-cols-3">
          {highlights.map(([number, title, text]) => <article key={number} className="rounded-2xl p-4 transition hover:bg-white/70"><span className="text-xs font-black text-tide">{number}</span><h2 className="mt-5 text-xl font-black tracking-tight">{title}</h2><p className="mt-3 leading-7 text-slate-600">{text}</p></article>)}
        </div>
      </section>
    </main>
  );
}
