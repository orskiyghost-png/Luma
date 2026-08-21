"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "./actions";

type Profile = {
  display_name: string;
  bio: string | null;
  city: string | null;
  city_visible: boolean;
  avatar_url: string | null;
  avatar_full_url: string | null;
};

const initialState: ProfileState = { error: null, success: null };

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="grid gap-5">
      {state.error && <p className="error-message">{state.error}</p>}
      {state.success && <p className="rounded-xl bg-tide/10 p-3 text-sm font-semibold text-emerald-800">{state.success}</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="field"><label htmlFor="displayName">Имя</label><input id="displayName" name="displayName" defaultValue={profile?.display_name ?? ""} required /></div>
        <div className="field"><label htmlFor="city">Город</label><input id="city" name="city" defaultValue={profile?.city ?? ""} placeholder="Например, Казань" /></div>
      </div>
      <div className="field"><label htmlFor="bio">О себе</label><textarea id="bio" name="bio" rows={4} maxLength={500} defaultValue={profile?.bio ?? ""} placeholder="Коротко о себе" /></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="field"><label htmlFor="avatarUrl">Маленькая аватарка (URL)</label><input id="avatarUrl" name="avatarUrl" type="url" defaultValue={profile?.avatar_url ?? ""} placeholder="https://…" /></div>
        <div className="field"><label htmlFor="avatarFullUrl">Большая аватарка (URL)</label><input id="avatarFullUrl" name="avatarFullUrl" type="url" defaultValue={profile?.avatar_full_url ?? ""} placeholder="https://…" /></div>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold text-slate-600"><input className="h-4 w-4 accent-tide" type="checkbox" name="cityVisible" defaultChecked={profile?.city_visible ?? true} /> Показывать город в профиле</label>
      <button className="primary-button w-full sm:w-fit disabled:cursor-wait disabled:opacity-60" type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить профиль"}</button>
    </form>
  );
}
