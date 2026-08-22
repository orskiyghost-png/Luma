"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReportDialog } from "@/components/report-dialog";
import {
  getConversation,
  sendMessage,
  setConversationStatus,
  type ConversationRow,
  type MessageRow,
  type ProfileCard,
} from "../actions";

type ChatRoomProps = {
  conversation: ConversationRow;
  partner: ProfileCard | null;
  initialMessages: MessageRow[];
  me: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function ChatRoom({ conversation, partner, initialMessages, me }: ChatRoomProps) {
  const [status, setStatus] = useState(conversation.status);
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [reporting, setReporting] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const partnerName = partner?.display_name ?? "Пользователь";
  const isInitiator = conversation.initiator_id === me;
  // Приглашение, на которое должен ответить текущий пользователь.
  const awaitingMyAccept = status === "pending" && !isInitiator;
  const canWrite = status === "accepted" || (status === "pending" && isInitiator);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Реалтайм: подписываемся на новые сообщения этой беседы.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  async function refresh() {
    const result = await getConversation(conversation.id);
    if (!("error" in result)) setMessages(result.messages);
  }

  async function handleSend() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    const result = await sendMessage(conversation.id, body);
    setSending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setText("");
    setMessages((prev) => (prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message]));
  }

  async function handleAccept() {
    setError(null);
    const result = await setConversationStatus(conversation.id, "accepted");
    if ("error" in result) setError(result.error);
    else {
      setStatus("accepted");
      void refresh();
    }
  }

  async function handleBlock() {
    setError(null);
    const result = await setConversationStatus(conversation.id, "blocked");
    if ("error" in result) setError(result.error);
    else setStatus("blocked");
  }

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <Link href="/messages" className="rounded-lg px-2 py-1 text-lg font-black text-slate-500 hover:text-ink">
          ←
        </Link>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sm font-black text-white">
          {partnerName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{partnerName}</p>
          {partner?.city && <p className="truncate text-xs text-slate-400">{partner.city}</p>}
        </div>
        {status !== "blocked" && (
          <button
            type="button"
            onClick={handleBlock}
            className="text-xs font-bold text-slate-400 hover:text-coral"
          >
            Заблокировать
          </button>
        )}
        {partner?.user_id && (
          <button
            type="button"
            onClick={() => setReporting(true)}
            className="text-xs font-bold text-slate-400 hover:text-coral"
            title="Пожаловаться"
          >
            ⚑
          </button>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-slate-400">
            {isInitiator
              ? "Напишите первое сообщение — собеседник увидит приглашение."
              : "Здесь появится переписка."}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                  mine ? "bg-ink text-white" : "bg-slate-100 text-ink"
                }`}
              >
                {m.body}
                <span className={`mt-1 block text-[10px] ${mine ? "text-white/50" : "text-slate-400"}`}>
                  {new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {status === "blocked" && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 text-center text-sm font-bold text-slate-500">
          Беседа заблокирована.
        </div>
      )}

      {awaitingMyAccept && (
        <div className="border-t border-slate-200 bg-tide/5 px-4 py-4">
          <p className="mb-3 text-center text-sm text-slate-600">
            {partnerName} предлагает начать переписку. Принять приглашение?
          </p>
          {error && <p className="mb-3 text-center text-sm font-bold text-coral">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={handleBlock} className="secondary-button flex-1">
              Отклонить
            </button>
            <button type="button" onClick={handleAccept} className="primary-button flex-1">
              Принять
            </button>
          </div>
        </div>
      )}

      {canWrite && (
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          {status === "pending" && isInitiator && (
            <p className="mb-2 text-center text-xs text-slate-400">
              Приглашение отправлено. Собеседник ответит, когда примет его.
            </p>
          )}
          {error && <p className="mb-2 text-sm font-bold text-coral">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Сообщение…"
              rows={1}
              maxLength={4000}
              className="max-h-32 flex-1 resize-none rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-tide focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="primary-button px-5 disabled:opacity-50"
            >
              {sending ? "…" : "→"}
            </button>
          </div>
        </div>
      )}
      {reporting && partner?.user_id && (
        <ReportDialog
          targetType="profile"
          targetId={partner.user_id}
          onClose={() => setReporting(false)}
        />
      )}
    </main>
  );
}
