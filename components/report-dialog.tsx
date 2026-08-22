"use client";

import { useState } from "react";
import { submitReport } from "@/app/actions/reports";
import { REPORT_REASONS, type ReportTargetType } from "@/lib/reports";

type ReportDialogProps = {
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
};

export function ReportDialog({ targetType, targetId, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0].code);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    const result = await submitReport(targetType, targetId, reason, details);
    setBusy(false);
    if ("error" in result) setError(result.error);
    else setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,15,23,.5)] p-5 backdrop-blur-sm" onClick={onClose}>
      <div className="form-card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <h3 className="text-xl font-black tracking-tight text-ink">Жалоба отправлена</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              Спасибо. Модераторы рассмотрят обращение.
            </p>
            <button type="button" onClick={onClose} className="primary-button mt-5 w-full">
              Закрыть
            </button>
          </>
        ) : (
          <>
            <h3 className="text-xl font-black tracking-tight text-ink">Пожаловаться</h3>
            <p className="mt-1 mb-4 text-sm leading-6 text-[var(--text-muted)]">
              Выберите причину. Модераторы увидят обращение в очереди.
            </p>
            <div className="grid gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setReason(r.code)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                    reason === r.code
                      ? "border-tide bg-tide/10 text-ink"
                      : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--line-strong)]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Подробности (необязательно)"
              rows={2}
              maxLength={1800}
              className="mt-3 w-full rounded-2xl border-2 border-[var(--line)] bg-[var(--surface-soft)] p-3 text-sm text-ink placeholder:text-[var(--text-muted)] focus:border-tide focus:outline-none"
            />
            {error && <p className="mt-3 text-sm font-bold text-coral">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={onClose} className="secondary-button flex-1">
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={busy}
                className="primary-button flex-1 disabled:opacity-60"
              >
                {busy ? "Отправляем…" : "Отправить"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
