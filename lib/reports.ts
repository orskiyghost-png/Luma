export type ReportTargetType = "marker" | "marker_zone" | "message" | "profile";

/** Причины жалобы, показываемые пользователю. */
export const REPORT_REASONS: { code: string; label: string }[] = [
  { code: "spam", label: "Спам или реклама" },
  { code: "offensive", label: "Оскорбления, агрессия" },
  { code: "danger", label: "Опасный или незаконный контент" },
  { code: "adult", label: "Контент 18+ / неуместное" },
  { code: "other", label: "Другое" },
];
