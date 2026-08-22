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
    // Включение требует геолокации браузера.
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
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-black tracking-tight">Безопасность и приватность</h2>
      <p className="mt-2 mb-6 text-sm leading-6 text-slate-500">
        Живая геопозиция и «люди рядом» — строго добровольные функции. По умолчанию они выключены.
      </p>

      <div className="rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <span className={`grid h-9 w-9 place-items-center rounded-xl text-lg ${isAdult ? "bg-tide/15" : "bg-slate-100"}`}>
            {isAdult ? "✅" : "🔞"}
          </span>
          <div>
            <p className="font-bold text-ink">Подтверждение 18+</p>
            <p className="text-xs text-slate-400">
              {isAdult ? "Возраст подтверждён." : "Нужно для показа живой геопозиции и функции «люди рядом»."}
            </p>
          </div>
        </div>

        {!isAdult && (
          <form action={confirmAction} className="mt-4">
            {adultState.error && <p className="error-message mb-3">{adultState.error}</p>}
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
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

      <div className={`mt-5 rounded-2xl border p-5 ${isAdult ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-ink">Показывать меня на карте</p>
            <p className="text-xs text-slate-400">
              Другие подтверждённые взрослые смогут видеть вашу приблизительную позицию. Выключить можно в любой момент.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={sharing}
            disabled={!isAdult || pending}
            onClick={() => toggleSharing(!sharing)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${sharing ? "bg-tide" : "bg-slate-300"}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${sharing ? "left-6" : "left-1"}`} />
          </button>
        </div>
        {shareError && <p className="error-message mt-3">{shareError}</p>}
        {!isAdult && <p className="mt-3 text-xs font-bold text-slate-400">Сначала подтвердите 18+.</p>}
      </div>
    </section>
  );
}
