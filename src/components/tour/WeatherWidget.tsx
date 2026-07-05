"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-context";

/**
 * Live marine-ish weather for the departure area (Marina Flamenco).
 * Uses the free Open-Meteo API — no key, no signup.
 */
type Weather = { temp: number; code: number };

const DESC: Record<number, { es: string; en: string; icon: string }> = {
  0: { es: "Despejado", en: "Clear sky", icon: "☀️" },
  1: { es: "Mayormente despejado", en: "Mostly clear", icon: "🌤️" },
  2: { es: "Parcialmente nublado", en: "Partly cloudy", icon: "⛅" },
  3: { es: "Nublado", en: "Overcast", icon: "☁️" },
  45: { es: "Neblina", en: "Fog", icon: "🌫️" },
  51: { es: "Llovizna", en: "Drizzle", icon: "🌦️" },
  61: { es: "Lluvia", en: "Rain", icon: "🌧️" },
  80: { es: "Chubascos", en: "Showers", icon: "🌦️" },
  95: { es: "Tormenta", en: "Thunderstorm", icon: "⛈️" },
};

function describe(code: number) {
  return DESC[code] ?? { es: "Variable", en: "Variable", icon: "🌊" };
}

export default function WeatherWidget({ lat, lng }: { lat: number; lng: number }) {
  const { locale } = useLocale();
  const [w, setW] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d?.current) {
          setW({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code });
        } else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [lat, lng]);

  if (failed) return null;

  const d = w ? describe(w.code) : null;
  return (
    <div className="weather-card">
      <span style={{ fontSize: 34 }}>{d?.icon ?? "🌊"}</span>
      <div>
        <div className="temp">{w ? `${w.temp}°C` : "…"}</div>
        <div style={{ fontSize: 13, color: "rgba(10,36,33,.6)" }}>
          {locale === "es" ? "Amador ahora" : "Amador now"} · {d ? d[locale] : "…"}
        </div>
      </div>
    </div>
  );
}
