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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?returnTo=/messages");

  const conversations = await listConversations();
  const incoming = conversations.filter(
    (c) => c.status === "pending" && c.initiator_id !== user.id,
  );
  const active = conversations.filter((c) => c !== undefined && !incoming.includes(c));

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-tide">Сообщения</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Беседы</h1>
          <p className="mt-2 text-slate-500">
            Переписка доступна только при взаимном согласии: приглашение нужно принять.
          </p>
        </div>

        {incoming.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-400">
              Приглашения к переписке
            </h2>
            <div className="grid gap-3">
              {incoming.map((c) => (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-tide/40 bg-tide/5 p-4 transition hover:bg-tide/10"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-tide text-lg font-black text-ink">
                    {initials(c.partner?.display_name ?? "?")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{c.partner?.display_name ?? "Пользователь"}</p>
                    <p className="truncate text-sm text-slate-500">
                      {c.lastMessage?.body ?? "Хочет начать переписку"}
                    </p>
                  </div>
                  <span className="rounded-full bg-tide px-3 py-1 text-xs font-black text-ink">Ответить</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {active.length === 0 && incoming.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-8 text-center">
            <p className="text-lg font-black tracking-tight text-ink">Пока нет бесед</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
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
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:shadow-sm"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-lg font-black text-white">
                  {initials(c.partner?.display_name ?? "?")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">
                    {c.partner?.display_name ?? "Пользователь"}
                    {c.status === "pending" && c.initiator_id === user.id && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                        ждёт ответа
                      </span>
                    )}
                    {c.status === "blocked" && (
                      <span className="ml-2 rounded-full bg-coral/15 px-2 py-0.5 text-xs font-bold text-coral">
                        заблокирована
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {c.lastMessage?.body ?? "Нет сообщений"}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-coral px-1.5 text-xs font-black text-white">
                    {c.unread}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
