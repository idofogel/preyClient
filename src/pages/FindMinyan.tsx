import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapView, type MapMarkerPrayer } from "../components/MapView";
import { listPrayers, toggleInterest } from "../lib/api";
import { haversineKm } from "../lib/geo";
import { PRAYER_TYPE_LABELS } from "../lib/prayerTypes";
import { getSocket } from "../lib/socket";
import { getParticipantToken } from "../lib/storage";
import { useGeolocation } from "../lib/useGeolocation";
import type { Prayer } from "../types";

const MIN_RADIUS_KM = 0;
const MAX_RADIUS_KM = 30;
const DEFAULT_RADIUS_KM = 5;

function popupHtml(prayer: Prayer): string {
  const started = prayer.started ? "Prayer has started" : "Gathering people";
  const distance = prayer.distanceKm !== undefined ? `${prayer.distanceKm.toFixed(1)} km away` : "";
  const cta = prayer.interested ? "Click again to cancel" : "Click marker to say you're coming";
  return `
    <div class="popup">
      <strong>${PRAYER_TYPE_LABELS[prayer.prayerType]} &middot; ${started}</strong>
      ${prayer.details ? `<p>${escapeHtml(prayer.details)}</p>` : ""}
      <p>${prayer.comingCount} coming &middot; ${prayer.presentCount} present</p>
      ${distance ? `<p class="popup-distance">${distance}</p>` : ""}
      <p class="popup-cta">${cta}</p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

export function FindMinyan() {
  const geo = useGeolocation();
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const participantToken = useMemo(() => getParticipantToken(), []);

  const geoRef = useRef(geo.location);
  geoRef.current = geo.location;
  const radiusRef = useRef(radiusKm);
  radiusRef.current = radiusKm;

  useEffect(() => {
    if (!geo.location) return;
    const timer = setTimeout(() => {
      listPrayers({
        lat: geo.location!.lat,
        lng: geo.location!.lng,
        radiusKm,
        participantToken,
      }).then(setPrayers);
    }, 200);
    return () => clearTimeout(timer);
  }, [geo.location, radiusKm, participantToken]);

  useEffect(() => {
    const socket = getSocket();

    const withinRadius = (p: Prayer) => {
      const loc = geoRef.current;
      if (!loc) return false;
      return haversineKm(loc.lat, loc.lng, p.lat, p.lng) <= radiusRef.current;
    };

    const onNew = (prayer: Prayer) => {
      if (!withinRadius(prayer)) return;
      setPrayers((prev) => (prev.some((p) => p.id === prayer.id) ? prev : [...prev, prayer]));
    };
    const onUpdate = (prayer: Prayer) => {
      setPrayers((prev) => {
        const exists = prev.some((p) => p.id === prayer.id);
        if (exists) return prev.map((p) => (p.id === prayer.id ? { ...p, ...prayer } : p));
        return withinRadius(prayer) ? [...prev, prayer] : prev;
      });
    };
    const onRemove = ({ id }: { id: string }) => {
      setPrayers((prev) => prev.filter((p) => p.id !== id));
    };

    socket.on("prayer:new", onNew);
    socket.on("prayer:update", onUpdate);
    socket.on("prayer:remove", onRemove);
    return () => {
      socket.off("prayer:new", onNew);
      socket.off("prayer:update", onUpdate);
      socket.off("prayer:remove", onRemove);
    };
  }, []);

  const handlePrayerClick = async (prayer: MapMarkerPrayer) => {
    const result = await toggleInterest(prayer.id, participantToken);
    setPrayers((prev) => prev.map((p) => (p.id === prayer.id ? { ...p, ...result } : p)));
  };

  const markers: MapMarkerPrayer[] = prayers.map((p) => ({ ...p, popupHtml: popupHtml(p) }));

  return (
    <div className="page page-find">
      <header className="page-header">
        <Link to="/" className="back-link">
          &larr; חזרה
        </Link>
        <h2>מצא מניין</h2>
      </header>

      {geo.error && <p className="notice">{geo.error}</p>}

      <div className="radius-control">
        <label htmlFor="radius">טווח חיפוש {radiusKm} km</label>
        <input
          id="radius"
          type="range"
          min={MIN_RADIUS_KM}
          max={MAX_RADIUS_KM}
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
        />
      </div>

      {geo.loading || !geo.location ? (
        <p className="notice">Locating you&hellip;</p>
      ) : (
        <MapView
          center={geo.location}
          radiusKm={radiusKm}
          prayers={markers}
          onPrayerClick={handlePrayerClick}
        />
      )}

      <p className="legend">
        <span className="legend-dot legend-dot-user" /> מיקומך
        <span className="legend-dot legend-dot-prayer" /> מניינים ({prayers.length} לידך)
      </p>
    </div>
  );
}
