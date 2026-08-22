"use client";

import { useState, useTransition } from "react";
import {
  deleteMarkerAsStaff,
  setReportStatus,
  setUserBan,
  setUserRole,
  type ReportItem,
} from "./actions";

const TYPE_LABEL: Record<string, string> = {
  marker: "Метка",
  message: "Сообщение",
  profile: "Профиль",
  marker_zone: "Зона",
};

export function AdminReports({
  reports,
  canManageRoles,
}: {
  reports: ReportItem[];
  canManageRoles: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function run(fn: () => Promise<{ error: string } | { ok: true }>) {
    startTransition(async () => {
      const result = await fn();
      setNote("error" in result ? result.error : "Готово.");
    });
  }

  if (reports.length === 0) {
    return <p className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">Жалоб нет.</p>;
  }

  return (
    <div className="space-y-4">
      {note && (
        <p className="rounded-xl bg-tide/10 px-4 py-2 text-sm font-bold text-emerald-800">{note}</p>
      )}
      {reports.map((r) => (
        <div key={r.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-black text-[var(--text-soft)]">
              {TYPE_LABEL[r.target_type] ?? r.target_type}
            </span>
            <span
              className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                r.status === "open"
                  ? "bg-coral/15 text-coral"
                  : r.status === "resolved"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-[var(--surface-soft)] text-[var(--text-muted)]"
              }`}
            >
              {r.status}
            </span>
            <span className="ml-auto text-xs text-[var(--text-muted)]">
              {new Date(r.created_at).toLocaleString("ru-RU")}
            </span>
          </div>

          <p className="mt-3 text-sm font-bold text-ink">{r.reason}</p>
          {r.target_summary && (
            <p className="mt-1 rounded-xl bg-[var(--surface-soft)] p-3 text-sm text-[var(--text-soft)]">
              «{r.target_summary}»
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => run(() => setReportStatus(r.id, "reviewing"))} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--text-soft)] hover:border-[var(--line-strong)] disabled:opacity-50">В работу</button>
            <button type="button" disabled={pending} onClick={() => run(() => setReportStatus(r.id, "resolved"))} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">Решено</button>
            <button type="button" disabled={pending} onClick={() => run(() => setReportStatus(r.id, "rejected"))} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--text-soft)] hover:border-[var(--line-strong)] disabled:opacity-50">Отклонить</button>

            {r.target_type === "marker" && (
              <button type="button" disabled={pending} onClick={() => run(() => deleteMarkerAsStaff(r.target_id))} className="rounded-lg border border-coral/30 bg-coral/10 px-3 py-1.5 text-xs font-bold text-coral hover:bg-coral/20 disabled:opacity-50">Удалить метку</button>
            )}

            {r.target_author && (
              <>
                <button type="button" disabled={pending} onClick={() => run(() => setUserBan(r.target_author!, true))} className="rounded-lg border border-coral/30 bg-coral/10 px-3 py-1.5 text-xs font-bold text-coral hover:bg-coral/20 disabled:opacity-50">Забанить автора</button>
                <button type="button" disabled={pending} onClick={() => run(() => setUserBan(r.target_author!, false))} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--text-soft)] hover:border-[var(--line-strong)] disabled:opacity-50">Разбанить</button>
              </>
            )}

            {canManageRoles && r.target_author && (
              <button type="button" disabled={pending} onClick={() => run(() => setUserRole(r.target_author!, "moderator"))} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--text-soft)] hover:border-[var(--line-strong)] disabled:opacity-50">Сделать модератором</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
