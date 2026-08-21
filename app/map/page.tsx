import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MapView from "@/components/map-view";

/**
 * Главный экран приложения — карта на весь экран.
 * Требует входа: без сессии пользователь уходит на /auth
 * и после входа возвращается сюда (returnTo=/map).
 */
export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth?returnTo=/map");

  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const styleUrl = key
    ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`
    : null;

  return <MapView styleUrl={styleUrl} />;
}
