import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConversation } from "../actions";
import { ChatRoom } from "./chat-room";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?returnTo=/messages/${id}`);

  const result = await getConversation(id);
  if ("error" in result) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="form-card max-w-md text-center">
          <h1 className="text-2xl font-black tracking-tight">Беседа недоступна</h1>
          <p className="mt-3 text-sm text-slate-600">{result.error}</p>
          <a href="/messages" className="secondary-button mt-6 inline-flex">К списку бесед</a>
        </div>
      </main>
    );
  }

  return (
    <ChatRoom
      conversation={result.conversation}
      partner={result.partner}
      initialMessages={result.messages}
      me={result.me}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
      supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}
    />
  );
}
