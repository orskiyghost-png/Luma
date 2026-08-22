import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MapView from "@/components/map-view";
import { getActiveMarkers, type MarkerRow } from "./actions";

/**
 * Главный экран приложения — карта на весь экран с метками.
 * Требует входа; без сессии → /auth?returnTo=/map.
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

  // Начальные метки — загружаются на сервере для быстрой отрисовки.
  let markers: MarkerRow[] = [];
  try {
    markers = await getActiveMarkers();
  } catch {
    // Без меток карта всё равно работает.
  }

  return (
    <MapView
      styleUrl={styleUrl}
      initialMarkers={markers}
      currentUserId={user.id}
    />
  );
}