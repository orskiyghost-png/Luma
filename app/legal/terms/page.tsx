import Link from "next/link";
import SiteHeader from "@/components/site-header";

export const metadata = { title: "Пользовательское соглашение — Luma" };

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-tide">Правовая информация</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Пользовательское соглашение</h1>
        <p className="mt-3 text-sm text-slate-400">Это типовой шаблон. Владелец сервиса отредактирует текст перед публичным запуском.</p>

        <div className="mt-8 space-y-6 text-slate-700">
          <section>
            <h2 className="text-xl font-black text-ink">1. Кто может пользоваться сервисом</h2>
            <p className="mt-2 leading-7">
              Регистрация доступна с 16 лет. Отдельные функции (показ живой геопозиции, «люди рядом») доступны только
              пользователям, подтвердившим, что им исполнилось 18 лет.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">2. Правила поведения</h2>
            <p className="mt-2 leading-7">
              Запрещены спам, оскорбления, разжигание вражды, публикация опасного, незаконного или сексуализированного
              контента, а также выдача себя за другого человека. Нарушения ведут к удалению контента и блокировке аккаунта.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">3. Контент пользователей</h2>
            <p className="mt-2 leading-7">
              Вы отвечаете за метки, реакции и сообщения, которые публикуете. Мы можем удалять контент, нарушающий правила,
              и рассматривать жалобы через систему модерации.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">4. Безопасность и геопозиция</h2>
            <p className="mt-2 leading-7">
              Показ живой геопозиции — добровольный и по умолчанию выключен. Делитесь местоположением осознанно.
              Сервис предоставляется «как есть»; будьте внимательны при встречах с людьми из интернета.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">5. Ответственность</h2>
            <p className="mt-2 leading-7">
              Сервис не несёт ответственности за действия пользователей и достоверность опубликованных ими данных
              в пределах, допустимых законом.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">6. Изменения</h2>
            <p className="mt-2 leading-7">
              Условия могут обновляться. Продолжая пользоваться сервисом после изменений, вы принимаете новую редакцию.
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4">
          <Link href="/legal/privacy" className="secondary-button">Политика конфиденциальности</Link>
          <Link href="/" className="secondary-button">На главную</Link>
        </div>
      </article>
    </main>
  );
}
