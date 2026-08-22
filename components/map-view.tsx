"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapMouseEvent, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { addMarker, deleteMarker, getActiveMarkers, type MarkerRow } from "@/app/map/actions";
import { CATEGORIES } from "@/lib/markers";

type MapViewProps = {
  styleUrl: string | null;
  initialMarkers: MarkerRow[];
  currentUserId: string;
};

const CATEGORY_ICON: Record<string, string> = {
  dtp: "🚗",
  police: "🚔",
  hangout: "🎉",
  other: "📌",
};

const CATEGORY_COLOR: Record<string, string> = {
  dtp: "#ff8066",
  police: "#4b7bec",
  hangout: "#27b99a",
  other: "#778ca3",
};

function buildMarkerEl(category: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "luma-marker-dot";
  el.style.cssText = [
    "width:36px;height:36px;border-radius:50% 50% 50% 0",
    `background:${CATEGORY_COLOR[category] ?? "#778ca3"}`,
    "border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,.25)",
    "display:grid;place-items:center;font-size:18px;cursor:pointer",
    "transform:rotate(-45deg);transition:transform .2s",
  ].join(";");
  el.innerHTML = `<span style="transform:rotate(45deg)">${CATEGORY_ICON[category] ?? "📍"}</span>`;
  return el;
}

export default function MapView({ styleUrl, initialMarkers, currentUserId }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const markerRefs = useRef<Map<string, Marker>>(new Map());

  const [mode, setMode] = useState<"checking" | "webgl" | "fallback">(
    styleUrl ? "checking" : "fallback",
  );
  const [askGeo, setAskGeo] = useState(false);
  const [locating, setLocating] = useState(false);
  const [city, setCity] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const [center, setCenter] = useState({ lat: 55.7558, lng: 37.6173 });
  const centerRef = useRef(center);
  centerRef.current = center;

  /* ---- Состояние создания метки ---- */
  const [placing, setPlacing] = useState(false);
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);
  const [pendingCategory, setPendingCategory] = useState("other");
  const [pendingText, setPendingText] = useState("");
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /* ---- Попап метки ---- */
  const [popupMarker, setPopupMarker] = useState<MarkerRow | null>(null);

  const [markers, setMarkers] = useState<MarkerRow[]>(initialMarkers);
  const markersRef = useRef(markers);
  markersRef.current = markers;

  // ====== Карта (один раз) ======
  useEffect(() => {
    if (!styleUrl) return;

    let settled = false;
    let map: MapLibreMap | null = null;

    const switchToFallback = (message?: string) => {
      if (settled) return;
      settled = true;
      if (map) { map.remove(); map = null; }
      mapRef.current = null;
      userMarkerRef.current = null;
      if (message) setMapError(message);
      setMode("fallback");
    };

    try {
      map = new maplibregl.Map({
        container: containerRef.current!,
        style: styleUrl,
        center: [centerRef.current.lng, centerRef.current.lat],
        zoom: 9,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }));
      mapRef.current = map;

      map.on("load", () => {
        if (!settled) { settled = true; setMode("webgl"); }
      });

      map.on("error", (event) => {
        const msg = (event as unknown as { error?: { message?: string } }).error?.message ?? "";
        if (!settled && msg) switchToFallback(msg);
      });

      const timeout = setTimeout(() => switchToFallback(), 8000);
      return () => {
        clearTimeout(timeout);
        if (map) { map.remove(); }
      };
    } catch (error) {
      switchToFallback(String(error).slice(0, 160));
    }
  }, [styleUrl]);

  // ====== Метки на карте ======
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== "webgl") return;

    function syncMarkers() {
      const m = mapRef.current;
      if (!m) return;
      markerRefs.current.forEach((mk) => mk.remove());
      markerRefs.current.clear();

      markersRef.current.forEach((row) => {
        const el = buildMarkerEl(row.category);
        const mk = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([row.lng, row.lat])
          .addTo(m);
        el.addEventListener("click", () => setPopupMarker(row));
        markerRefs.current.set(row.id, mk);
      });
    }

    if (!map.isStyleLoaded()) {
      map.once("load", syncMarkers);
      return () => { map.off("load", syncMarkers); };
    }
    syncMarkers();
  }, [mode, markers]);

  // ====== Геолокация ======
  const locateUser = useCallback(() => {
    setAskGeo(false);
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Ваш браузер не поддерживает определение местоположения.");
      return;
    }
    setLocating(true);
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          const { longitude, latitude } = pos.coords;
          setCity(null);
          setCenter({ lat: latitude, lng: longitude });
          const map = mapRef.current;
          if (map) {
            map.flyTo({ center: [longitude, latitude], zoom: 14, duration: 1600 });
            if (userMarkerRef.current) userMarkerRef.current.remove();
            const el = document.createElement("div");
            el.className = "luma-user-dot";
            userMarkerRef.current = new maplibregl.Marker({ element: el })
              .setLngLat([longitude, latitude]).addTo(map);
          }
          const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
          if (key) {
            fetch(`https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${encodeURIComponent(key)}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((d: { features?: Array<{ text?: string }> } | null) =>
                setCity(d?.features?.[0]?.text ?? null))
              .catch(() => {});
          }
        },
        (error) => {
          setLocating(false);
          if (error.code === error.PERMISSION_DENIED)
            setGeoError("Доступ к местоположению закрыт. Чтобы разрешить: настройки браузера → разрешения → местоположение.");
          else if (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT)
            setGeoError("Не удалось определить координаты (нет сигнала GPS).");
          else
            setGeoError("Не удалось определить местоположение. Попробуйте ещё раз.");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
      );
    } catch {
      setLocating(false);
      setGeoError("Браузер заблокировал запрос местоположения. Откройте сайт напрямую в Chrome/Safari.");
    }
  }, []);

  // ====== Клик по карте в режиме размещения ======
  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!placing) return;
      setPendingLat(e.lngLat.lat);
      setPendingLng(e.lngLat.lng);
      setPendingCategory("other");
      setPendingText("");
      setActionError(null);
    },
    [placing],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== "webgl") return;
    map.on("click", handleMapClick);
    if (placing) map.getCanvas().style.cursor = "crosshair";
    else map.getCanvas().style.cursor = "";
    return () => {
      map.off("click", handleMapClick);
      if (map.getCanvas()) map.getCanvas().style.cursor = "";
    };
  }, [mode, placing, handleMapClick]);

  async function handleCreate() {
    if (pendingLat == null || pendingLng == null) return;
    setSending(true);
    setActionError(null);
    const result = await addMarker(pendingLat, pendingLng, pendingCategory, pendingText);
    setSending(false);
    if ("error" in result) { setActionError(result.error); return; }
    setPlacing(false);
    setPendingLat(null);
    setPendingLng(null);
    try { setMarkers(await getActiveMarkers()); } catch { /* ignore */ }
  }

  async function handleDelete(markerId: string) {
    setActionError(null);
    const result = await deleteMarker(markerId);
    if ("error" in result) { setActionError(result.error); return; }
    setPopupMarker(null);
    setMarkers((prev) => prev.filter((m) => m.id !== markerId));
  }

  // ====== OSM fallback ======
  const osmEmbedUrl = (() => {
    const dLat = 0.03;
    const dLng = 0.05;
    const { lat, lng } = center;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat}`)}&layer=mapnik&marker=${lat},${lng}`;
  })();

  // ====== Рендер ======
  if (!styleUrl) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f8f4] px-5">
        <div className="form-card max-w-md text-center">
          <h1 className="text-2xl font-black tracking-tight">Карта скоро появится</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Не задан ключ карт (NEXT_PUBLIC_MAPTILER_KEY). Добавьте его в настройках Freebuff.
          </p>
          <Link href="/profile" className="secondary-button mt-6 inline-flex">В профиль</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-full overflow-hidden">
      {mode !== "fallback" && <div ref={containerRef} className="absolute inset-0" />}

      {/* Загрузка */}
      {mode === "checking" && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#f5f8f4]">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-tide border-t-transparent" />
            <p className="text-sm font-bold text-slate-500">Загружаем карту…</p>
          </div>
        </div>
      )}

      {/* OSM fallback */}
      {mode === "fallback" && (
        <>
          <iframe title="Карта" src={osmEmbedUrl} className="absolute inset-0 h-full w-full border-0" />
          {mapError && (
            <div className="absolute left-1/2 top-20 z-10 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl bg-white/95 p-4 text-xs leading-5 text-slate-500 shadow-xl">
              Быстрая карта недоступна. Показана упрощённая версия — метки не отображаются.
              <button type="button" onClick={() => setMapError(null)} className="mt-2 block text-xs font-black uppercase tracking-wider text-slate-400 hover:text-ink">Понятно</button>
            </div>
          )}
        </>
      )}

      {/* Шапка */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-4">
        <Link href="/" className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur transition hover:bg-white">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-sm font-black text-white">L</span>
          <span className="text-base font-black tracking-tight text-ink">Luma</span>
        </Link>
        <div className="pointer-events-auto flex items-center gap-2">
          {city && <span className="hidden rounded-2xl bg-white/90 px-4 py-2.5 text-sm font-bold text-ink shadow-lg backdrop-blur sm:block">📍 {city}</span>}
          <Link href="/profile" className="rounded-2xl bg-white/90 px-4 py-2.5 text-sm font-bold text-ink shadow-lg backdrop-blur transition hover:bg-white">Профиль</Link>
        </div>
      </header>

      {/* Нижние кнопки */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center gap-3">
        <button type="button" onClick={() => setAskGeo(true)} disabled={locating}
          className="pointer-events-auto primary-button shadow-xl disabled:cursor-wait disabled:opacity-70">
          {locating ? "Определяем…" : "📍 Моё место"}
        </button>
        {mode === "webgl" && (
          <button
            type="button"
            onClick={() => { setPlacing(!placing); setPendingLat(null); setPendingLng(null); setActionError(null); }}
            className={`pointer-events-auto rounded-2xl px-4 py-3 text-sm font-black shadow-xl transition ${
              placing ? "bg-coral text-white" : "bg-ink text-white hover:bg-ink/90"
            }`}
          >
            {placing ? "✕ Отмена" : "＋ Метка"}
          </button>
        )}
      </div>

      {/* Подсказка при размещении */}
      {placing && !pendingLat && (
        <div className="absolute bottom-28 left-1/2 z-20 w-[min(90vw,24rem)] -translate-x-1/2 rounded-2xl bg-ink/90 px-5 py-3 text-sm font-bold text-white shadow-xl text-center">
          Нажмите на карту, чтобы поставить метку
        </div>
      )}

      {/* Форма создания метки */}
      {placing && pendingLat != null && pendingLng != null && (
        <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[2rem] bg-white px-5 pb-8 pt-6 shadow-[0_-8px_40px_rgba(0,0,0,.15)]">
          <h3 className="mb-4 text-lg font-black tracking-tight text-ink">Новая метка</h3>
          <div className="mb-4 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setPendingCategory(cat.id)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  pendingCategory === cat.id
                    ? "bg-ink text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <textarea
            value={pendingText}
            onChange={(e) => setPendingText(e.target.value)}
            placeholder="Что здесь происходит?"
            maxLength={280}
            rows={2}
            className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-sm font-medium text-ink placeholder:text-slate-400 focus:border-tide focus:outline-none"
          />
          {actionError && <p className="mt-3 text-sm font-bold text-coral">{actionError}</p>}
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => { setPendingLat(null); setPendingLng(null); }} className="secondary-button flex-1">Отмена</button>
            <button type="button" onClick={handleCreate} disabled={sending || !pendingText.trim()} className="primary-button flex-1 disabled:opacity-50">
              {sending ? "Публикуем…" : "Опубликовать"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Метка исчезнет через {CATEGORIES.find((c) => c.id === pendingCategory)?.ttlHours ?? 12} ч.
          </p>
        </div>
      )}

      {/* Попап метки */}
      {popupMarker && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-ink/30 p-5 backdrop-blur-sm" onClick={() => setPopupMarker(null)}>
          <div className="form-card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 text-2xl">{CATEGORY_ICON[popupMarker.category] ?? "📍"}</div>
            <p className="text-sm font-bold text-ink">{CATEGORIES.find((c) => c.id === popupMarker.category)?.label ?? popupMarker.category}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{popupMarker.text || "Без текста"}</p>
            <p className="mt-1 text-xs text-slate-400">
              {new Date(popupMarker.created_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              {" · "}
              {(() => {
                const left = Math.round((new Date(popupMarker.expires_at).getTime() - Date.now()) / 3600_000 / 10) / 10;
                return left <= 0 ? "истекает" : `ещё ≈${left} ч`;
              })()}
            </p>
            {popupMarker.author_id === currentUserId && (
              <button type="button" onClick={() => handleDelete(popupMarker.id)} className="mt-4 text-sm font-bold text-coral hover:underline">Удалить метку</button>
            )}
            <button type="button" onClick={() => setPopupMarker(null)} className="mt-3 block w-full text-center text-xs font-bold text-slate-400 hover:text-ink">Закрыть</button>
          </div>
        </div>
      )}

      {/* Геолокация — объяснение */}
      {askGeo && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-ink/40 p-5 backdrop-blur-sm">
          <div className="form-card max-w-md">
            <h2 className="text-2xl font-black tracking-tight">Зачем нам ваше местоположение?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Мы покажем <strong>только вам</strong>, где вы находитесь, чтобы было удобно ориентироваться на карте. Ваша позиция <strong>не публикуется</strong>.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={locateUser} className="primary-button flex-1">Показать моё место</button>
              <button type="button" onClick={() => setAskGeo(false)} className="secondary-button flex-1">Не сейчас</button>
            </div>
          </div>
        </div>
      )}

      {/* Ошибка геолокации */}
      {geoError && (
        <div className="absolute bottom-24 left-1/2 z-20 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl bg-white/95 p-4 text-sm leading-6 text-slate-700 shadow-xl backdrop-blur">
          {geoError}
          <button type="button" onClick={() => setGeoError(null)} className="mt-2 block text-xs font-black uppercase tracking-wider text-slate-400 hover:text-ink">Понятно</button>
        </div>
      )}
    </main>
  );
}