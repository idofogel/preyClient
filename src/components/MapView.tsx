import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Prayer } from "../types";

const MAP_STYLE =
  "https://raw.githubusercontent.com/go2garret/maps/main/src/assets/json/openStreetMap.json";

export interface MapMarkerPrayer extends Prayer {
  popupHtml?: string;
}

interface MapViewProps {
  center: { lat: number; lng: number };
  radiusKm?: number;
  prayers?: MapMarkerPrayer[];
  onPrayerClick?: (prayer: MapMarkerPrayer) => void;
}

export function MapView({ center, radiusKm, prayers = [], onPrayerClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const prayerMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const onPrayerClickRef = useRef(onPrayerClick);
  onPrayerClickRef.current = onPrayerClick;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: "map-container",
      style: MAP_STYLE,
      center: [center.lng, center.lat],
      zoom: 13,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      prayerMarkersRef.current.clear();
    };
    // Map is created once; center updates are handled via flyTo below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "marker marker-user";
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([center.lng, center.lat])
        .addTo(map);
      map.setCenter([center.lng, center.lat]);
    } else {
      userMarkerRef.current.setLngLat([center.lng, center.lat]);
      map.flyTo({ center: [center.lng, center.lat] });
    }
  }, [center.lat, center.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = "search-radius";
    const applyRadius = () => {
      if (radiusKm === undefined) return;
      const circleGeoJson = circlePolygon(center.lat, center.lng, radiusKm);
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(circleGeoJson);
      } else if (map.isStyleLoaded()) {
        map.addSource(sourceId, { type: "geojson", data: circleGeoJson });
        map.addLayer({
          id: `${sourceId}-fill`,
          type: "fill",
          source: sourceId,
          paint: { "fill-color": "#2563eb", "fill-opacity": 0.08 },
        });
        map.addLayer({
          id: `${sourceId}-line`,
          type: "line",
          source: sourceId,
          paint: { "line-color": "#2563eb", "line-width": 2 },
        });
      }
    };

    if (map.isStyleLoaded()) applyRadius();
    else map.once("load", applyRadius);
  }, [center.lat, center.lng, radiusKm]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(prayers.map((p) => p.id));
    for (const [id, marker] of prayerMarkersRef.current) {
      if (!currentIds.has(id)) {
        marker.remove();
        prayerMarkersRef.current.delete(id);
      }
    }

    for (const prayer of prayers) {
      let marker = prayerMarkersRef.current.get(prayer.id);
      if (!marker) {
        const el = document.createElement("div");
        el.className = "marker marker-prayer";
        el.addEventListener("click", () => onPrayerClickRef.current?.(prayer));
        marker = new maplibregl.Marker({ element: el })
          .setLngLat([prayer.lng, prayer.lat])
          .addTo(map);
        prayerMarkersRef.current.set(prayer.id, marker);
      }
      if (prayer.popupHtml) {
        const existingPopup = marker.getPopup();
        if (existingPopup) {
          existingPopup.setHTML(prayer.popupHtml);
        } else {
          marker.setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(prayer.popupHtml));
        }
      }
    }
  }, [prayers]);

  return <div ref={containerRef} id="map-container" className="map-container" />;
}

function circlePolygon(lat: number, lng: number, radiusKm: number, points = 64) {
  const coords: [number, number][] = [];
  const earthRadiusKm = 6371;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusKm / earthRadiusKm) * Math.cos(angle);
    const dy = (radiusKm / earthRadiusKm) * Math.sin(angle);
    const latOffset = (dy * 180) / Math.PI;
    const lngOffset = ((dx * 180) / Math.PI) / Math.cos((lat * Math.PI) / 180);
    coords.push([lng + lngOffset, lat + latOffset]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coords] },
  };
}
