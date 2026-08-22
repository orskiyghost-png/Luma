import Link from "next/link";
import SiteHeader from "@/components/site-header";

export const metadata = { title: "Политика конфиденциальности — Luma" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-tide">Правовая информация</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Политика конфиденциальности</h1>
        <p className="mt-3 text-sm text-slate-400">Это типовой шаблон. Владелец сервиса отредактирует текст перед публичным запуском.</p>

        <div className="mt-8 space-y-6 text-slate-700">
          <section>
            <h2 className="text-xl font-black text-ink">1. Какие данные мы собираем</h2>
            <p className="mt-2 leading-7">
              Email и пароль (в зашифрованном виде) для входа, отображаемое имя, при желании — город и описание профиля.
              Дата рождения используется только для проверки минимального возраста и не публикуется.
              Метки, реакции и сообщения, которые вы создаёте, хранятся, пока вы их не удалите или пока не истечёт срок метки.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">2. Геопозиция</h2>
            <p className="mt-2 leading-7">
              Приблизительная позиция используется, чтобы показать карту вокруг вас. Постоянный показ вашей живой
              геопозиции другим по умолчанию выключен, доступен только подтверждённым пользователям 18+ и включается
              вручную. Вы можете выключить его в один клик в любой момент.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">3. Как используются данные</h2>
            <p className="mt-2 leading-7">
              Для работы сервиса: показа карты, меток и переписки, модерации и обеспечения безопасности.
              Мы не продаём ваши персональные данные третьим лицам.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">4. Хранение и защита</h2>
            <p className="mt-2 leading-7">
              Данные хранятся у поставщика инфраструктуры (Supabase). Доступ к чужим данным ограничен политиками
              безопасности на уровне базы. Пароли не хранятся в открытом виде.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">5. Ваши права</h2>
            <p className="mt-2 leading-7">
              Вы можете изменить данные профиля, удалить свои метки и сообщения, а также запросить удаление аккаунта.
              По вопросам приватности свяжитесь с владельцем сервиса.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">6. Cookie</h2>
            <p className="mt-2 leading-7">
              Мы используем только технические cookie, необходимые для входа и работы сессии. Рекламных трекеров нет.
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4">
          <Link href="/legal/terms" className="secondary-button">Пользовательское соглашение</Link>
          <Link href="/" className="secondary-button">На главную</Link>
        </div>
      </article>
    </main>
  );
}
