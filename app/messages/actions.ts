"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security";

export type ConversationStatus = "pending" | "accepted" | "blocked";

export type ConversationRow = {
  id: string;
  user_low: string;
  user_high: string;
  initiator_id: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type ProfileCard = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
};

export type ConversationView = ConversationRow & {
  partner: ProfileCard | null;
  lastMessage: MessageRow | null;
  unread: number;
};

/** Каноническая пара (меньший uuid — user_low), чтобы беседа была единственной. */
function orderPair(a: string, b: string): { low: string; high: string } {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

/** Возвращает публичные карточки профилей по списку id (без открытия таблицы). */
async function loadProfileCards(ids: string[]): Promise<Map<string, ProfileCard>> {
  const map = new Map<string, ProfileCard>();
  if (ids.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_profile_cards", { ids });
  for (const card of (data as ProfileCard[] | null) ?? []) {
    map.set(card.user_id, card);
  }
  return map;
}

/**
 * Начинает (или находит существующую) беседу с автором метки/другим
 * пользователем. Первое обращение создаётся в статусе pending — получатель
 * должен принять его, прежде чем беседа станет двусторонней.
 */
export async function startConversation(
  partnerId: string,
): Promise<{ error: string } | { conversationId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нужно войти в аккаунт." };
  if (partnerId === user.id) return { error: "Нельзя написать самому себе." };

  const { low, high } = orderPair(user.id, partnerId);

  const { data: existing } = await supabase
    .from("conversations")
    .select("id, status")
    .eq("user_low", low)
    .eq("user_high", high)
    .maybeSingle();

  if (existing) return { conversationId: existing.id };

  // Антиспам: не больше 10 новых бесед в час на пользователя.
  const allowed = await checkRateLimit("start_conversation", 10, 3600);
  if (!allowed) return { error: "Слишком много новых бесед подряд. Попробуйте позже." };

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ user_low: low, user_high: high, initiator_id: user.id })
    .select("id")
    .single();

  if (error || !created) return { error: "Не удалось начать беседу." };
  return { conversationId: created.id };
}

/** Меняет статус беседы: принять приглашение или заблокировать. */
export async function setConversationStatus(
  conversationId: string,
  status: Exclude<ConversationStatus, "pending">,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нужно войти в аккаунт." };

  const { error } = await supabase
    .from("conversations")
    .update({ status })
    .eq("id", conversationId);

  if (error) return { error: "Не удалось изменить статус беседы." };
  revalidatePath("/messages");
  return { ok: true };
}

/** Список бесед текущего пользователя с карточкой собеседника и превью. */
export async function listConversations(): Promise<ConversationView[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  const rows = (conversations as ConversationRow[] | null) ?? [];
  if (rows.length === 0) return [];

  const partnerIds = rows.map((c) => (c.user_low === user.id ? c.user_high : c.user_low));
  const cards = await loadProfileCards(partnerIds);

  const views: ConversationView[] = [];
  for (const c of rows) {
    const partnerId = c.user_low === user.id ? c.user_high : c.user_low;
    const { data: lastArr } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", c.id)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .limit(1);
    const lastMessage = ((lastArr as MessageRow[] | null) ?? [])[0] ?? null;

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", c.id)
      .eq("recipient_id", user.id)
      .is("read_at", null);

    views.push({
      ...c,
      partner: cards.get(partnerId) ?? null,
      lastMessage,
      unread: count ?? 0,
    });
  }
  return views;
}

/** Полная переписка одной беседы. Проверяет, что пользователь — участник. */
export async function getConversation(
  conversationId: string,
): Promise<
  | { error: string }
  | { conversation: ConversationRow; partner: ProfileCard | null; messages: MessageRow[]; me: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нужно войти в аккаунт." };

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) return { error: "Беседа не найдена." };
  const conv = conversation as ConversationRow;
  if (conv.user_low !== user.id && conv.user_high !== user.id) {
    return { error: "Нет доступа к этой беседе." };
  }

  const partnerId = conv.user_low === user.id ? conv.user_high : conv.user_low;
  const cards = await loadProfileCards([partnerId]);

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("deleted", false)
    .order("created_at", { ascending: true });

  // Отметить полученные сообщения прочитанными.
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  return {
    conversation: conv,
    partner: cards.get(partnerId) ?? null,
    messages: (messages as MessageRow[] | null) ?? [],
    me: user.id,
  };
}

/** Отправляет сообщение в беседу. RLS гарантирует правило согласия. */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ error: string } | { message: MessageRow }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нужно войти в аккаунт." };

  const trimmed = body.trim().slice(0, 4000);
  if (!trimmed) return { error: "Пустое сообщение." };

  // Антиспам: не больше 20 сообщений в минуту на пользователя.
  const allowed = await checkRateLimit("send_message", 20, 60);
  if (!allowed) return { error: "Слишком много сообщений подряд. Подождите немного." };

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return { error: "Беседа не найдена." };
  const conv = conversation as ConversationRow;
  if (conv.user_low !== user.id && conv.user_high !== user.id) {
    return { error: "Нет доступа к этой беседе." };
  }
  if (conv.status === "blocked") return { error: "Беседа заблокирована." };
  if (conv.status === "pending" && conv.initiator_id !== user.id) {
    return { error: "Сначала примите приглашение к переписке." };
  }

  const recipientId = conv.user_low === user.id ? conv.user_high : conv.user_low;

  const { data: created, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      recipient_id: recipientId,
      body: trimmed,
    })
    .select("*")
    .single();

  if (error || !created) return { error: "Не удалось отправить сообщение." };
  return { message: created as MessageRow };
}
