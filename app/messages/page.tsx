import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/site-header";
import { listConversations } from "./actions";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?returnTo=/messages");

  const conversations = await listConversations();
  const incoming = conversations.filter((c) => c.status === "pending" && c.initiator_id !== user.id);
  const active = conversations.filter((c) => c !== undefined && !incoming.includes(c));

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-8">
          <p className="eyebrow text-tide">Сообщения</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Беседы</h1>
          <p className="mt-3 max-w-xl text-[var(--text-soft)]">
            Переписка доступна только при взаимном согласии: приглашение нужно принять.
          </p>
        </div>

        {incoming.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Приглашения</h2>
            <div className="grid gap-3">
              {incoming.map((c) => (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="glass-control flex items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-lg font-black text-[var(--accent-ink)]">
                    {initials(c.partner?.display_name ?? "?")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[var(--text)]">{c.partner?.display_name ?? "Пользователь"}</p>
                    <p className="truncate text-sm text-[var(--text-muted)]">{c.lastMessage?.body ?? "Хочет начать переписку"}</p>
                  </div>
                  <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-black text-[var(--accent-ink)]">Ответить</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {active.length === 0 && incoming.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <p className="text-lg font-black tracking-tight text-[var(--text)]">Пока нет бесед</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--text-soft)]">
              Откройте метку на карте и нажмите «Написать автору», чтобы предложить общение.
            </p>
            <Link href="/map" className="primary-button mt-6 inline-flex">Открыть карту</Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {active.map((c) => (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className="glass-control flex items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-soft)] text-lg font-black text-[var(--text)]">
                  {initials(c.partner?.display_name ?? "?")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[var(--text)]">
                    {c.partner?.display_name ?? "Пользователь"}
                    {c.status === "pending" && c.initiator_id === user.id && (
                      <span className="ml-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 text-xs font-bold text-[var(--text-muted)]">ждёт ответа</span>
                    )}
                    {c.status === "blocked" && (
                      <span className="ml-2 rounded-full border border-[rgba(255,155,155,.25)] bg-[rgba(255,155,155,.1)] px-2 py-0.5 text-xs font-bold text-[var(--danger)]">заблокирована</span>
                    )}
                  </p>
                  <p className="truncate text-sm text-[var(--text-muted)]">{c.lastMessage?.body ?? "Нет сообщений"}</p>
                </div>
                {c.unread > 0 && (
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[var(--danger)] px-1.5 text-xs font-black text-[var(--accent-ink)]">{c.unread}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
