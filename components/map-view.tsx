"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type MapViewProps = {
  /** Готовый URL стиля MapTiler с ключом или null, если ключ не задан. */
  styleUrl: string | null;
};

/**
 * Главный экран приложения — карта на весь экран.
 *
 * Надёжность: основной вариант — быстрая векторная карта MapLibre.
 * Если устройство/браузер не умеет WebGL (например, встроенные браузеры
 * мессенджеров и приватные браузеры), через несколько секунд ожидания
 * автоматически включается запасная карта OpenStreetMap — она работает
 * везде и тоже поддерживает перемещение и геолокацию.
 *
 * Приватность: геолокация НИКОГДА не запрашивается сама — только после
 * объяснения и явного нажатия кнопки пользователем.
 */
export default function MapView({ styleUrl }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  const [mode, setMode] = useState<"checking" | "webgl" | "fallback">(
    styleUrl ? "checking" : "fallback",
  );
  const [askGeo, setAskGeo] = useState(false);
  const [locating, setLocating] = useState(false);
  const [city, setCity] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Текущий центр для запасной карты (iframe OSM).
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: 55.7558,
    lng: 37.6173,
  });
  const centerRef = useRef(center);
  centerRef.current = center;

  // Пытаемся запустить основную карту; если за 8 секунд она не загрузилась —
  // переключаемся на запасную, чтобы пользователь никогда не видел пустоту.
  useEffect(() => {
    if (!styleUrl || mode !== "checking") return;

    let settled = false;
    let map: MapLibreMap | null = null;

    const finishWebgl = () => {
      if (!settled) {
        settled = true;
        setMode("webgl");
      }
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

      map.on("load", () => {
        finishWebgl();
      });

      map.on("error", (event) => {
        // Ошибки отдельных тайлов не должны убивать карту; реагируем только
        // пока карта ещё считается «загружающейся».
        if (!settled) {
          const message =
            (event as unknown as { error?: { message?: string } }).error?.message ?? "";
          if (message) {
            settled = true;
            setMapError(message);
            setMode("fallback");
          }
        }
      });

      mapRef.current = map;
    } catch (error) {
      settled = true;
      setMapError(String(error).slice(0, 160));
      setMode("fallback");
      return () => {};
    }

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setMode("fallback");
      }
    }, 8000);

    return () => {
      clearTimeout(timeout);
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [styleUrl, mode]);

  /** Общая логика геолокации для обоих вариантов карты. */
  const locateUser = useCallback(() => {
    setAskGeo(false);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Ваш браузер не поддерживает определение местоположения.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { longitude, latitude } = position.coords;
        setCity(null);
        setCenter({ lat: latitude, lng: longitude });

        // Основная карта: перелёт и своя точка.
        const map = mapRef.current;
        if (map && mode === "webgl") {
          map.flyTo({ center: [longitude, latitude], zoom: 14, duration: 1600 });

          if (markerRef.current) markerRef.current.remove();
          const element = document.createElement("div");
          element.className = "luma-user-dot";
          markerRef.current = new maplibregl.Marker({ element })
            .setLngLat([longitude, latitude])
            .addTo(map);
        }

        // Город по координатам (обратное геокодирование MapTiler).
        const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
        if (key) {
          fetch(
            `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${encodeURIComponent(key)}`,
          )
            .then((res) => (res.ok ? res.json() : null))
            .then((data: { features?: Array<{ text?: string }> } | null) => {
              setCity(data?.features?.[0]?.text ?? null);
            })
            .catch(() => setCity(null));
        }
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Доступ к местоположению закрыт. Карта работает и без него — включить можно в настройках браузера.");
        } else {
          setGeoError("Не удалось определить местоположение. Попробуйте ещё раз.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, [mode]);

  /** Запасная карта OpenStreetMap: рамка вокруг центра. */
  const osmEmbedUrl = (() => {
    const dLat = 0.03;
    const dLng = 0.05;
    const { lat, lng } = center;
    const bbox = `${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`;
  })();

  if (!styleUrl) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f8f4] px-5">
        <div className="form-card max-w-md text-center">
          <h1 className="text-2xl font-black tracking-tight">Карта скоро появится</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Не задан ключ карт (NEXT_PUBLIC_MAPTILER_KEY). Добавьте его в
            настройках Freebuff: Settings → Environment.
          </p>
          <Link href="/profile" className="secondary-button mt-6 inline-flex">В профиль</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* Слой карты */}
      {mode !== "fallback" && <div ref={containerRef} className="absolute inset-0" />}

      {/* Запасная карта OSM (работает даже без WebGL) */}
      {mode === "fallback" && (
        <>
          <iframe
            title="Карта"
            src={osmEmbedUrl}
            className="absolute inset-0 h-full w-full border-0"
          />
          {mapError && (
            <div className="absolute left-1/2 top-20 z-10 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl bg-white/95 p-4 text-xs leading-5 text-slate-500 shadow-xl">
              Быстрая карта недоступна на этом устройстве{mapError ? ` (${mapError})` : ""}.
              Показана упрощённая версия — всё остальное работает как обычно.
              <button
                type="button"
                onClick={() => setMapError(null)}
                className="mt-2 block text-xs font-black uppercase tracking-wider text-slate-400 hover:text-ink"
              >
                Понятно
              </button>
            </div>
          )}
        </>
      )}

      {/* Верхняя панель поверх карты */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-4">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur transition hover:bg-white"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-sm font-black text-white">L</span>
          <span className="text-base font-black tracking-tight text-ink">Luma</span>
        </Link>

        <div className="pointer-events-auto flex items-center gap-2">
          {city && (
            <span className="hidden rounded-2xl bg-white/90 px-4 py-2.5 text-sm font-bold text-ink shadow-lg backdrop-blur sm:block">
              📍 {city}
            </span>
          )}
          <Link
            href="/profile"
            className="rounded-2xl bg-white/90 px-4 py-2.5 text-sm font-bold text-ink shadow-lg backdrop-blur transition hover:bg-white"
          >
            Профиль
          </Link>
        </div>
      </header>

      {/* Кнопка геолокации */}
      <button
        type="button"
        onClick={() => setAskGeo(true)}
        disabled={locating}
        className="primary-button absolute bottom-6 left-1/2 z-20 -translate-x-1/2 shadow-xl disabled:cursor-wait disabled:opacity-70"
      >
        {locating ? "Определяем…" : "Моё местоположение"}
      </button>

      {/* Объяснение перед запросом геолокации (запрос только по согласию) */}
      {askGeo && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-ink/40 p-5 backdrop-blur-sm">
          <div className="form-card max-w-md">
            <h2 className="text-2xl font-black tracking-tight">Зачем нам ваше местоположение?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Мы покажем <strong>только вам</strong>, где вы находитесь, чтобы было
              удобно ориентироваться на карте. Ваша позиция{" "}
              <strong>не публикуется</strong> и никому не видна — показ себя на
              карте всегда выключен по умолчанию и включается только вручную.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={locateUser} className="primary-button flex-1">
                Показать моё место
              </button>
              <button type="button" onClick={() => setAskGeo(false)} className="secondary-button flex-1">
                Не сейчас
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ошибка геолокации */}
      {geoError && (
        <div className="absolute bottom-24 left-1/2 z-20 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl bg-white/95 p-4 text-sm leading-6 text-slate-700 shadow-xl backdrop-blur">
          {geoError}
          <button
            type="button"
            onClick={() => setGeoError(null)}
            className="mt-2 block text-xs font-black uppercase tracking-wider text-slate-400 hover:text-ink"
          >
            Понятно
          </button>
        </div>
      )}
    </main>
  );
}
