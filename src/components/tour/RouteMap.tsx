"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from "react-leaflet";
import type { Tour } from "@/content/tours";
import { useLocale } from "@/lib/locale-context";
import { L } from "@/lib/i18n";

/**
 * Interactive route map for a tour's itinerary.
 * Uses free OpenStreetMap tiles (no API key) and CircleMarkers so we don't
 * depend on Leaflet's default marker image assets.
 */
export default function RouteMap({ tour }: { tour: Tour }) {
  const { locale } = useLocale();
  const stops = tour.itinerary.filter((s) => s.coord) as Array<
    Tour["itinerary"][number] & { coord: { lat: number; lng: number } }
  >;
  if (stops.length === 0) return null;

  const points = stops.map((s) => [s.coord.lat, s.coord.lng] as [number, number]);
  const center = points[Math.floor(points.length / 2)];

  return (
    <MapContainer
      center={center}
      zoom={points.length > 1 ? 9 : 11}
      scrollWheelZoom={false}
      className="route-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.length > 1 ? (
        <Polyline positions={points} pathOptions={{ color: "#b8733a", weight: 3, dashArray: "6 8" }} />
      ) : null}
      {stops.map((s, i) => (
        <CircleMarker
          key={i}
          center={[s.coord.lat, s.coord.lng]}
          radius={9}
          pathOptions={{ color: "#0a2421", fillColor: "#d7a85b", fillOpacity: 1, weight: 2 }}
        >
          <Popup>
            <strong>{L(s.title, locale)}</strong>
            <br />
            {L(s.detail, locale)}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
