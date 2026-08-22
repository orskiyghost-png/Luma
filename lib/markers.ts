/** TTL категорий (в часах). Обоснование: актуальность события. */
export const CATEGORY_TTL: Record<string, number> = {
  dtp: 4,       // ДТП: актуально пока пробка/авария
  police: 2,    // Полиция: экипажи быстро уезжают
  hangout: 6,   // Гуляем: прогулка/вечеринка длится несколько часов
  other: 12,    // Своя категория: средний срок
};

export const DEFAULT_TTL_HOURS = 12;

/** Категории, доступные пользователю. */
export const CATEGORIES = [
  { id: "dtp", label: "🚗 ДТП", ttlHours: 4 },
  { id: "police", label: "🚔 Полиция", ttlHours: 2 },
  { id: "hangout", label: "🎉 Гуляем", ttlHours: 6 },
  { id: "other", label: "📌 Другое", ttlHours: 12 },
] as const;

/** Реакции на метки (тот же набор, что и в серверном действии toggleReaction). */
export const REACTIONS = ["👍", "❤️", "⚠️", "🙏", "👀"] as const;