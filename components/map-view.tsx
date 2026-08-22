"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapMouseEvent, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { addMarker, deleteMarker, getActiveMarkers, getMarkerReactions, getNearbyPeople, saveCurrentLocation, toggleReaction, type MarkerRow, type NearbyPerson, type ReactionSummary } from "@/app/map/actions";
import { startConversation } from "@/app/messages/actions";
import { CATEGORIES, REACTIONS } from "@/lib/markers";
import { ReportDialog } from "@/components/report-dialog";

type MapViewProps = {
  styleUrl: string | null;
  initialMarkers: MarkerRow[];
  currentUserId: string;
};

const CATEGORY_ICON: Record<string, string> = {
  dtp: "◆",
  police: "✚",
  hangout: "✦",
  other: "•",
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
    el.innerHTML = `<span aria-hidden="true" style="transform:rotate(45deg);font-weight:800">${CATEGORY_ICON[category] ?? "•"}</span>`;
  return el;
}

export default function MapView({ styleUrl, initialMarkers, currentUserId }: MapViewProps) {
  const router = useRouter();
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
  const [locationSaved, setLocationSaved] = useState(false);
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
  const [pendingScreen, setPendingScreen] = useState<{ x: number; y: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /* ---- Попап метки ---- */
  const [popupMarker, setPopupMarker] = useState<MarkerRow | null>(null);
  const [reactions, setReactions] = useState<ReactionSummary>({ counts: {}, mine: [] });
  const [reactionBusy, setReactionBusy] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [reportMarkerId, setReportMarkerId] = useState<string | null>(null);

  /* ---- «Люди рядом» (только 18+, opt-in) ---- */
  const [nearby, setNearby] = useState<NearbyPerson[]>([]);
  const [showNearby, setShowNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [popupPerson, setPopupPerson] = useState<NearbyPerson | null>(null);
  const nearbyMarkerRefs = useRef<Map<string, Marker>>(new Map());

  const [showMarkers, setShowMarkers] = useState(true);
  const [markers, setMarkers] = useState<MarkerRow[]>(initialMarkers);
  const markersRef = useRef(markers);
  markersRef.current = markers;

  // Метки загружаются после первого показа карты, а не блокируют её открытие.
  useEffect(() => {
    let active = true;
    void getActiveMarkers()
      .then((loaded) => {
        if (active) setMarkers(loaded);
      })
      .catch(() => {
        // Пустая карта остаётся рабочей даже при временной ошибке сети.
      });
    return () => { active = false; };
  }, []);

  const osmBounds = {
    west: center.lng - 0.05,
    east: center.lng + 0.05,
    south: center.lat - 0.03,
    north: center.lat + 0.03,
  };

  // Последняя разрешённая точка остаётся на этом устройстве между открытиями
  // страницы. Это не публикация позиции и не заменяет явное разрешение.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("luma:last-location") ?? "null") as { lat?: number; lng?: number } | null;
      if (saved && typeof saved.lat === "number" && typeof saved.lng === "number") {
        setCenter({ lat: saved.lat, lng: saved.lng });
      }
    } catch {
      // Повреждённое локальное значение не должно ломать карту.
    }
  }, []);

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
      let startCenter = centerRef.current;
      try {
        const saved = JSON.parse(localStorage.getItem("luma:last-location") ?? "null") as { lat?: number; lng?: number } | null;
        if (saved && typeof saved.lat === "number" && typeof saved.lng === "number") {
          startCenter = { lat: saved.lat, lng: saved.lng };
        }
      } catch {
        // Используем город по умолчанию, если приватный браузер запретил storage.
      }
      map = new maplibregl.Map({
        container: containerRef.current!,
        style: styleUrl,
        center: [startCenter.lng, startCenter.lat],
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

      const timeout = setTimeout(() => switchToFallback(), 3000);
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
      if (!showMarkers) return;

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
  }, [mode, markers, showMarkers]);

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
          setGeoError(null);
          setLocationSaved(false);
          setCenter({ lat: latitude, lng: longitude });
          try { localStorage.setItem("luma:last-location", JSON.stringify({ lat: latitude, lng: longitude })); } catch {
            // Локальное хранилище может быть запрещено приватным браузером.
          }
          void saveCurrentLocation(latitude, longitude).then((result) => {
            if ("error" in result) setGeoError(result.error);
            else setLocationSaved(true);
          }).catch(() => setGeoError("Место определено, но сохранить его не удалось."));
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
  const handleFallbackMapClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    setPlacing(true);
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const xRatio = Math.max(0, Math.min(1, x / rect.width));
    const yRatio = Math.max(0, Math.min(1, y / rect.height));
    setPendingScreen({ x, y });
    setPendingLng(osmBounds.west + xRatio * (osmBounds.east - osmBounds.west));
    setPendingLat(osmBounds.north - yRatio * (osmBounds.north - osmBounds.south));
    setPendingCategory("other");
    setPendingText("");
    setActionError(null);
  }, [osmBounds.east, osmBounds.north, osmBounds.south, osmBounds.west]);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      setPlacing(true);
      setPendingLat(e.lngLat.lat);
      setPendingLng(e.lngLat.lng);
      setPendingScreen(null);
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
    setPendingScreen(null);
    try { setMarkers(await getActiveMarkers()); } catch { /* ignore */ }
  }

  async function handleDelete(markerId: string) {
    setActionError(null);
    const result = await deleteMarker(markerId);
    if ("error" in result) { setActionError(result.error); return; }
    setPopupMarker(null);
    setMarkers((prev) => prev.filter((m) => m.id !== markerId));
  }

  // Реакции подгружаются при открытии попапа метки.
  useEffect(() => {
    if (!popupMarker) return;
    let active = true;
    setReactions({ counts: {}, mine: [] });
    void getMarkerReactions(popupMarker.id)
      .then((summary) => { if (active) setReactions(summary); })
      .catch(() => {});
    return () => { active = false; };
  }, [popupMarker]);

  async function handleToggleReaction(type: string) {
    if (!popupMarker || reactionBusy) return;
    setReactionBusy(true);
    const result = await toggleReaction(popupMarker.id, type);
    setReactionBusy(false);
    if (!("error" in result)) setReactions(result);
  }

  async function handleContactAuthor(authorId: string) {
    setContactError(null);
    setContactBusy(true);
    const result = await startConversation(authorId);
    setContactBusy(false);
    if ("error" in result) { setContactError(result.error); return; }
    router.push(`/messages/${result.conversationId}`);
  }

  const loadNearby = useCallback(async () => {
    setNearbyError(null);
    setNearbyLoading(true);
    const result = await getNearbyPeople();
    setNearbyLoading(false);
    if ("error" in result) {
      setNearbyError(result.error);
      setNearby([]);
      return;
    }
    setNearby(result.people);
  }, []);

  async function handleToggleNearby() {
    const next = !showNearby;
    setShowNearby(next);
    if (next) await loadNearby();
    else setNearbyError(null);
  }

  async function handleContactPerson(userId: string) {
    setContactError(null);
    setContactBusy(true);
    const result = await startConversation(userId);
    setContactBusy(false);
    if ("error" in result) { setContactError(result.error); return; }
    router.push(`/messages/${result.conversationId}`);
  }

  // Маркеры «людей рядом» на WebGL-карте: добавляются/снимаются вместе с
  // переключателем showNearby и обновлением списка.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== "webgl") return;

    nearbyMarkerRefs.current.forEach((mk) => mk.remove());
    nearbyMarkerRefs.current.clear();
    if (!showNearby) return;

    function render() {
      const m = mapRef.current;
      if (!m) return;
      nearby.forEach((person) => {
        const el = document.createElement("div");
        el.style.cssText = [
          "width:34px;height:34px;border-radius:50%",
          "background:#27b99a;border:3px solid white",
          "box-shadow:0 3px 12px rgba(0,0,0,.25)",
          "display:grid;place-items:center;font-size:16px;cursor:pointer",
        ].join(";");
        el.textContent = "◉";
        const mk = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([person.lng, person.lat])
          .addTo(m);
        el.addEventListener("click", () => setPopupPerson(person));
        nearbyMarkerRefs.current.set(person.user_id, mk);
      });
    }

    if (!map.isStyleLoaded()) {
      map.once("load", render);
      return () => { map.off("load", render); };
    }
    render();
  }, [mode, showNearby, nearby]);

  // ====== OSM fallback ======
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${osmBounds.west},${osmBounds.south},${osmBounds.east},${osmBounds.north}`)}&layer=mapnik&marker=${center.lat},${center.lng}`;
  const fallbackPointStyle = (lat: number, lng: number) => ({
    left: `${((lng - osmBounds.west) / (osmBounds.east - osmBounds.west)) * 100}%`,
    top: `${((osmBounds.north - lat) / (osmBounds.north - osmBounds.south)) * 100}%`,
  });

  // ====== Рендер ======
  if (!styleUrl) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f8f4] px-5">
        <div className="form-card max-w-md text-center">
          <h1 className="text-2xl font-black tracking-tight">Карта скоро появится</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Не задан ключ карт (NEXT_PUBLIC_MAPTILER_KEY). Добавьте его в переменные окружения.
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
          <div className="pointer-events-none absolute inset-0 z-[12]">
            {markers.map((row) => (
              <button
                key={row.id}
                type="button"
                aria-label={`Метка: ${row.text}`}
                onClick={(event) => { event.stopPropagation(); setPopupMarker(row); }}
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full rounded-full border-2 border-white px-2 py-1 text-base shadow-lg"
                style={{ ...fallbackPointStyle(row.lat, row.lng), backgroundColor: CATEGORY_COLOR[row.category] ?? "#778ca3" }}
              >
                {CATEGORY_ICON[row.category] ?? "⌖"}
              </button>
            ))}
          </div>
          {mapError && (
            <div className="absolute left-1/2 top-20 z-10 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl bg-white/95 p-4 text-xs leading-5 text-slate-500 shadow-xl">
              Быстрая карта недоступна. Показана упрощённая версия; выбранные метки остаются на экране.
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
          {city && <span className="hidden rounded-2xl bg-white/90 px-4 py-2.5 text-sm font-bold text-ink shadow-lg backdrop-blur sm:block">⌖ {city}</span>}
          <Link href="/messages" className="rounded-2xl bg-white/90 px-4 py-2.5 text-sm font-bold text-ink shadow-lg backdrop-blur transition hover:bg-white">Сообщения</Link>
          <Link href="/profile" className="rounded-2xl bg-white/90 px-4 py-2.5 text-sm font-bold text-ink shadow-lg backdrop-blur transition hover:bg-white">Профиль</Link>
        </div>
      </header>

      {/* Нижние кнопки */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex flex-wrap justify-center gap-3 px-4">
        <button type="button" onClick={() => setAskGeo(true)} disabled={locating}
          className="pointer-events-auto primary-button min-w-0 flex-1 shadow-xl disabled:cursor-wait disabled:opacity-70 sm:flex-none">
          {locating ? "Определяем…" : "⌖ Моё место"}
        </button>
        <button
          type="button"
          onClick={() => {
            const nextPlacing = !placing;
            setPlacing(nextPlacing);
            setActionError(null);
            setPendingLat(null);
            setPendingLng(null);
            setPendingScreen(null);
          }}
          className={`pointer-events-auto min-w-0 flex-1 rounded-2xl px-3 py-3 text-sm font-black shadow-xl transition sm:flex-none sm:px-4 ${
            placing ? "bg-coral text-white" : "bg-ink text-white hover:bg-ink/90"
          }`}
        >
          {placing ? "✕ Отмена" : "＋ Поставить метку"}
        </button>
        <button
          type="button"
          onClick={handleToggleNearby}
          disabled={nearbyLoading}
          className={`pointer-events-auto min-w-0 flex-1 rounded-2xl px-3 py-3 text-sm font-black shadow-xl transition disabled:opacity-70 sm:flex-none sm:px-4 ${
            showNearby ? "bg-tide text-ink" : "bg-white/90 text-ink hover:bg-white"
          }`}
        >
          {nearbyLoading ? "Ищем…" : showNearby ? "◉ Люди рядом ✓" : "◉ Люди рядом"}
        </button>
        <button
          type="button"
          onClick={() => setShowMarkers((visible) => !visible)}
          aria-pressed={showMarkers}
          aria-label={showMarkers ? "Скрыть метки" : "Показать метки"}
          className={`pointer-events-auto min-w-0 flex-1 rounded-2xl px-3 py-3 text-sm font-black shadow-xl transition sm:flex-none sm:px-4 ${
            showMarkers ? "bg-white/90 text-ink hover:bg-white" : "bg-ink text-white hover:bg-ink/90"
          }`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 inline-block h-4 w-4 align-[-0.15em]"><path d="M12 3l7 7-7 7-7-7 7-7Z"/><path d="M5 20h14"/></svg>
          <span className="hidden sm:inline">{showMarkers ? "Скрыть метки" : "Показать метки"}</span>
        </button>
      </div>

      {/* Выбор точки на запасной карте: overlay получает касание поверх iframe
          и переводит его в координаты видимой области карты. */}
      {mode === "fallback" && pendingLat == null && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Выбрать точку для метки"
          onClick={handleFallbackMapClick}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              const synthetic = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
              setPendingScreen({ x: rect.width / 2, y: rect.height / 2 });
              setPendingLng(osmBounds.west + (synthetic.clientX - rect.left) / rect.width * (osmBounds.east - osmBounds.west));
              setPendingLat(osmBounds.north - (synthetic.clientY - rect.top) / rect.height * (osmBounds.north - osmBounds.south));
            }
          }}
          className="absolute inset-0 z-[15] cursor-crosshair"
        />
      )}

      {placing && pendingLat == null && (
        <div className="absolute bottom-28 left-1/2 z-20 w-[min(90vw,24rem)] -translate-x-1/2 rounded-2xl bg-ink/90 px-5 py-3 text-center text-sm font-bold text-white shadow-xl">
          Нажмите на нужное место карты
        </div>
      )}

      {pendingScreen && mode === "fallback" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-[16] h-8 w-8 -translate-x-1/2 -translate-y-full rounded-full border-4 border-white bg-coral shadow-[0_3px_12px_rgba(0,0,0,.3)]"
          style={{ left: pendingScreen.x, top: pendingScreen.y }}
        />
      )}

      {placing && mode === "fallback" && pendingLat != null && (
        <div className="absolute bottom-28 left-1/2 z-20 w-[min(92vw,27rem)] -translate-x-1/2 rounded-2xl bg-ink/90 px-5 py-3 text-center text-sm font-bold text-white shadow-xl">
          Для этой версии карты метка будет поставлена в центре экрана. Нажмите «Опубликовать» ниже.
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
            <div className="mb-2 text-2xl">{CATEGORY_ICON[popupMarker.category] ?? "⌖"}</div>
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

            {/* Реакции */}
            <div className="mt-4 flex flex-wrap gap-2">
              {REACTIONS.map((emoji) => {
                const count = reactions.counts[emoji] ?? 0;
                const active = reactions.mine.includes(emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    disabled={reactionBusy}
                    onClick={() => handleToggleReaction(emoji)}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-bold transition disabled:opacity-60 ${
                      active
                        ? "border-tide bg-tide/15 text-ink"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span>{emoji}</span>
                    {count > 0 && <span className="text-xs">{count}</span>}
                  </button>
                );
              })}
            </div>

            {popupMarker.author_id === currentUserId ? (
              <button type="button" onClick={() => handleDelete(popupMarker.id)} className="mt-4 text-sm font-bold text-coral hover:underline">Удалить метку</button>
            ) : (
              <div className="mt-4">
                <button
                  type="button"
                  disabled={contactBusy}
                  onClick={() => handleContactAuthor(popupMarker.author_id)}
                  className="primary-button w-full disabled:opacity-60"
                >
                  {contactBusy ? "Открываем…" : "✉ Написать автору"}
                </button>
                {contactError && <p className="mt-2 text-sm font-bold text-coral">{contactError}</p>}
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Автор получит приглашение к переписке и сможет его принять или отклонить.
                </p>
                <button
                  type="button"
                  onClick={() => setReportMarkerId(popupMarker.id)}
                  className="mt-3 text-sm font-bold text-slate-400 hover:text-coral"
                >
                  ⚑ Пожаловаться на метку
                </button>
              </div>
            )}
            <button type="button" onClick={() => setPopupMarker(null)} className="mt-3 block w-full text-center text-xs font-bold text-slate-400 hover:text-ink">Закрыть</button>
          </div>
        </div>
      )}

      {reportMarkerId && (
        <ReportDialog
          targetType="marker"
          targetId={reportMarkerId}
          onClose={() => setReportMarkerId(null)}
        />
      )}

      {/* «Люди рядом»: сообщение об ошибке/пусто и попап человека */}
      {showNearby && nearbyError && (
        <div className="absolute bottom-24 left-1/2 z-20 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl bg-white/95 p-4 text-sm leading-6 text-slate-700 shadow-xl backdrop-blur">
          {nearbyError}
          {nearbyError.includes("18+") && (
            <Link href="/profile" className="mt-2 block text-xs font-black uppercase tracking-wider text-tide hover:text-ink">Подтвердить 18+ в профиле</Link>
          )}
          <button type="button" onClick={() => { setShowNearby(false); setNearbyError(null); }} className="mt-2 block text-xs font-black uppercase tracking-wider text-slate-400 hover:text-ink">Скрыть</button>
        </div>
      )}
      {showNearby && !nearbyError && !nearbyLoading && nearby.length === 0 && (
        <div className="absolute bottom-24 left-1/2 z-20 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl bg-white/95 p-4 text-sm leading-6 text-slate-600 shadow-xl backdrop-blur">
          Рядом пока никто не делится своим местоположением. Включить показ себя можно в профиле.
          <button type="button" onClick={() => setShowNearby(false)} className="mt-2 block text-xs font-black uppercase tracking-wider text-slate-400 hover:text-ink">Скрыть</button>
        </div>
      )}

      {popupPerson && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-ink/30 p-5 backdrop-blur-sm" onClick={() => setPopupPerson(null)}>
          <div className="form-card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              {popupPerson.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={popupPerson.avatar_url} alt="" className="h-12 w-12 rounded-2xl object-cover" />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-tide text-lg font-black text-ink">{popupPerson.display_name.slice(0, 1).toUpperCase()}</div>
              )}
              <div>
                <p className="font-black text-ink">{popupPerson.display_name}</p>
                {popupPerson.city && <p className="text-xs text-slate-400">⌖ {popupPerson.city}</p>}
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Этот человек подтвердил 18+ и добровольно показывает себя на карте.
            </p>
            {popupPerson.user_id !== currentUserId && (
              <button
                type="button"
                disabled={contactBusy}
                onClick={() => handleContactPerson(popupPerson.user_id)}
                className="primary-button mt-4 w-full disabled:opacity-60"
              >
                {contactBusy ? "Открываем…" : "✉ Написать"}
              </button>
            )}
            {contactError && <p className="mt-2 text-sm font-bold text-coral">{contactError}</p>}
            <button type="button" onClick={() => setPopupPerson(null)} className="mt-3 block w-full text-center text-xs font-bold text-slate-400 hover:text-ink">Закрыть</button>
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
      {locationSaved && !geoError && (
        <div className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-2xl bg-white/95 px-4 py-3 text-sm font-bold text-emerald-800 shadow-xl backdrop-blur">
          Местоположение сохранено только для вашего аккаунта
        </div>
      )}
      {geoError && (
        <div className="absolute bottom-24 left-1/2 z-20 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl bg-white/95 p-4 text-sm leading-6 text-slate-700 shadow-xl backdrop-blur">
          {geoError}
          <button type="button" onClick={() => setGeoError(null)} className="mt-2 block text-xs font-black uppercase tracking-wider text-slate-400 hover:text-ink">Понятно</button>
        </div>
      )}
    </main>
  );
      }
