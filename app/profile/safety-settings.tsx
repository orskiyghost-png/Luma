"use client";

import { useActionState, useState, useTransition } from "react";
import { confirmAdult, setLocationSharing, type ProfileState } from "./actions";

const initialState: ProfileState = { error: null, success: null };

type SafetySettingsProps = {
  ageVerifiedAdult: boolean;
  sharingEnabled: boolean;
};

export function SafetySettings({ ageVerifiedAdult, sharingEnabled }: SafetySettingsProps) {
  const [adultState, confirmAction, confirmPending] = useActionState(confirmAdult, initialState);
  const [checked, setChecked] = useState(false);
  const isAdult = ageVerifiedAdult || adultState.success !== null;
  const [sharing, setSharing] = useState(sharingEnabled);
  const [pending, startTransition] = useTransition();
  const [shareError, setShareError] = useState<string | null>(null);

  function toggleSharing(next: boolean) {
    setShareError(null);
    if (!next) {
      startTransition(async () => {
        const result = await setLocationSharing(false);
        if ("error" in result) setShareError(result.error);
        else setSharing(false);
      });
      return;
    }
    if (!navigator.geolocation) {
      setShareError("Браузер не поддерживает геолокацию.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        startTransition(async () => {
          const result = await setLocationSharing(true, pos.coords.latitude, pos.coords.longitude);
          if ("error" in result) setShareError(result.error);
          else setSharing(true);
        });
      },
      () => setShareError("Не удалось получить доступ к геолокации."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <section className="glass-panel p-6 sm:p-8">
      <h2 className="text-2xl font-black tracking-tight">Безопасность и приватность</h2>
      <p className="mt-2 mb-6 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
        Живая геопозиция и «люди рядом» — строго добровольные функции. По умолчанию они выключены.
      </p>

      <div className="glass-control rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${isAdult ? "bg-[rgba(123,231,210,.18)]" : "bg-[rgba(241,201,121,.14)]"}`} aria-hidden="true">
            {isAdult ? "✓" : "18+"}
          </span>
          <div>
            <p className="font-bold text-[var(--text)]">Подтверждение 18+</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              {isAdult ? "Возраст подтверждён." : "Нужно для показа живой геопозиции и функции «люди рядом»."}
            </p>
          </div>
        </div>

        {!isAdult && (
          <form action={confirmAction} className="mt-4">
            {adultState.error && <p className="error-message mb-3">{adultState.error}</p>}
            <label className="flex items-start gap-3 text-sm leading-6 text-[var(--text-soft)]">
              <input
                type="checkbox"
                name="confirm"
                className="mt-1 h-4 w-4 accent-tide"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              Подтверждаю, что мне исполнилось 18 лет. Понимаю, что показ живой геопозиции виден другим подтверждённым взрослым.
            </label>
            <button type="submit" disabled={!checked || confirmPending} className="primary-button mt-4 disabled:opacity-50">
              {confirmPending ? "Сохраняем…" : "Подтвердить 18+"}
            </button>
          </form>
        )}
      </div>

      <div className={`glass-control mt-4 rounded-2xl p-5 ${!isAdult ? "opacity-60" : ""}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-bold text-[var(--text)]">Показывать меня на карте</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Другие подтверждённые взрослые увидят только приблизительную позицию. Выключить можно в любой момент.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Показывать меня на карте"
            aria-checked={sharing}
            disabled={!isAdult || pending}
            onClick={() => toggleSharing(!sharing)}
            className={`relative h-7 w-12 shrink-0 rounded-full border border-[var(--line)] transition disabled:opacity-50 ${sharing ? "bg-[var(--accent)]" : "bg-[var(--surface-soft)]"}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-[var(--text)] shadow-sm transition-all ${sharing ? "left-6" : "left-1"}`} />
          </button>
        </div>
        {shareError && <p className="error-message mt-3">{shareError}</p>}
        {!isAdult && <p className="mt-3 text-xs font-bold text-[var(--text-muted)]">Сначала подтвердите 18+.</p>}
      </div>
    </section>
  );
}
