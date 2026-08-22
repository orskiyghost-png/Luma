import Link from "next/link";
import SiteHeader from "@/components/site-header";

const highlights = [
  { number: "01", title: "Отмечай контекст", text: "Короткая заметка с координатой, а не бесконечная лента. Город читается через то, что происходит рядом." },
  { number: "02", title: "Выбирай контакт", text: "Никаких случайных сообщений. Общение начинается только после взаимного согласия." },
  { number: "03", title: "Оставайся хозяином", text: "Точная позиция скрыта по умолчанию. Публичность — осознанная настройка, а не побочный эффект." },
];

function Arrow() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function Pin({ color = "mint" }: { color?: "mint" | "coral" | "white" }) {
  const palette = { mint: "#82f3d4", coral: "#ff9b7b", white: "#f4f8ff" };
  const glow = "0 0 0 7px " + palette[color] + "22, 0 10px 24px " + palette[color] + "33";
  return <span className="relative grid h-8 w-8 place-items-center rounded-full" style={{ background: "rgba(7,11,18,.52)", boxShadow: glow }}><span className="h-3.5 w-3.5 rounded-full border-[3px] border-white" style={{ background: palette[color] }} /></span>;
}

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <SiteHeader />
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[.95fr_1.05fr] lg:gap-20 lg:pb-24">
        <div className="animate-reveal">
          <p className="mb-7 inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[.22em] text-tide"><span className="h-2 w-2 rounded-full bg-tide shadow-[0_0_0_5px_rgba(130,243,212,.12)]" /> Luma / private map</p>
          <h1 className="max-w-3xl font-display text-[clamp(3.6rem,12vw,8.25rem)] font-semibold leading-[.87] tracking-[-.08em] text-white">Город, который становится <span className="text-tide">важным.</span></h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8">Luma превращает город в спокойную сеть заметок, мест и разговоров. Сначала доверие и контроль. Потом всё остальное.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth?mode=signup" className="primary-button justify-between sm:min-w-48">Начать бесплатно <Arrow /></Link>
            <Link href="/auth" className="secondary-button justify-between sm:min-w-48">Уже есть аккаунт <span className="font-mono text-xs text-[var(--text-muted)]">01</span></Link>
          </div>
          <div className="mt-12 flex max-w-md items-center gap-4 border-t border-white/10 pt-5 text-sm text-[var(--text-secondary)]"><span className="font-mono text-xs text-tide">01—03</span><span>Осознанные места. Спокойные люди. Никаких сюрпризов.</span></div>
        </div>

        <div className="relative animate-reveal lg:pl-8" style={{ animationDelay: "120ms" }}>
          <div className="absolute -inset-12 rounded-full bg-tide/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[30px] border border-white/15 bg-[#0c1422] p-2 shadow-[0_32px_100px_rgba(0,0,0,.45)]">
            <div className="relative min-h-[31rem] overflow-hidden rounded-[24px] border border-white/10 bg-[#101c30] p-5 sm:min-h-[36rem] sm:p-7">
              <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "linear-gradient(rgba(130,243,212,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(130,243,212,.07) 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
              <div className="absolute -right-20 top-20 h-64 w-64 rounded-full bg-coral/10 blur-3xl" />
              <div className="relative flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-tide">Live layer / 07</p><h2 className="mt-3 font-display text-2xl font-semibold tracking-[-.04em] text-white">Твоя карта</h2></div><span className="inline-flex items-center gap-2 rounded-full border border-tide/30 bg-tide/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.14em] text-tide"><span className="h-1.5 w-1.5 rounded-full bg-tide" /> online</span></div>
              <div className="relative mt-8 min-h-[21rem] overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_50%_42%,rgba(130,243,212,.24),transparent_28%),linear-gradient(145deg,#182c49,#0b1527)] shadow-inner shadow-black/20 sm:min-h-[24rem]">
                <div className="absolute left-[24%] top-[27%] animate-float"><Pin /></div>
                <div className="absolute right-[18%] top-[53%] animate-float" style={{ animationDelay: "1.2s" }}><Pin color="coral" /></div>
                <div className="absolute bottom-[26%] left-[47%] animate-float" style={{ animationDelay: "2.1s" }}><Pin color="white" /></div>
                <div className="absolute left-[13%] top-[68%] h-px w-[72%] rotate-[-12deg] bg-gradient-to-r from-transparent via-tide/40 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-[#17243a]/90 p-4 backdrop-blur-xl sm:inset-x-5 sm:bottom-5"><div className="flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[var(--text-muted)]">Around you</p><p className="mt-2 text-lg font-semibold tracking-[-.03em] text-white">3 свежие заметки</p></div><span className="grid h-9 w-9 place-items-center rounded-full border border-tide/30 text-tide"><Arrow /></span></div></div>
              </div>
              <div className="relative mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-white/[.055] p-4"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--text-muted)]">Privacy</p><p className="mt-2 text-sm font-semibold text-tide">Под контролем</p></div><div className="rounded-2xl border border-white/10 bg-white/[.055] p-4"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--text-muted)]">Live position</p><p className="mt-2 text-sm font-semibold text-white">Выключена</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 sm:pb-28"><div className="mb-8 flex items-end justify-between border-t border-white/10 pt-6"><div><p className="font-mono text-[11px] uppercase tracking-[.2em] text-tide">Why Luma</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-.06em] text-white sm:text-5xl">Меньше шума.<br />Больше смысла.</h2></div><span className="hidden font-mono text-xs text-[var(--text-muted)] sm:block">DESIGN PRINCIPLES / 2026</span></div><div className="grid gap-3 md:grid-cols-3">{highlights.map(({ number, title, text }) => <article key={number} className="glass-panel group min-h-56 !p-6 transition duration-500 hover:-translate-y-1 hover:border-tide/40"><div className="flex items-start justify-between"><span className="font-mono text-xs text-tide">{number}</span><Arrow /></div><h3 className="mt-14 font-display text-2xl font-semibold tracking-[-.04em] text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{text}</p></article>)}</div></section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8"><div className="relative overflow-hidden rounded-[28px] border border-tide/25 bg-[linear-gradient(120deg,rgba(130,243,212,.12),rgba(16,28,48,.75)_45%,rgba(255,155,123,.10))] p-6 sm:p-10"><div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-tide/10 blur-3xl" /><div className="relative flex flex-col justify-between gap-8 sm:flex-row sm:items-end"><div><p className="font-mono text-[11px] uppercase tracking-[.2em] text-tide">A quieter way to be nearby</p><h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold leading-[.95] tracking-[-.06em] text-white sm:text-5xl">Оставь в городе<br /><span className="text-tide">свою точку.</span></h2></div><Link href="/auth?mode=signup" className="primary-button shrink-0">Создать аккаунт <Arrow /></Link></div></div></section>
    </main>
  );
}
