import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MapView from "@/components/map-view";
import type { MarkerRow } from "./actions";

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

  // Запрос меток не блокирует открытие карты: MapView подгрузит их после
  // первого рендера, поэтому медленный Supabase не задерживает экран.
  const markers: MarkerRow[] = [];

  return (
    <MapView
      styleUrl={styleUrl}
      initialMarkers={markers}
      currentUserId={user.id}
    />
  );
}