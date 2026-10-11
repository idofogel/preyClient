import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  NotFoundError,
  adjustPresentCount,
  createPrayer,
  deletePrayer,
  getMyPrayer,
  startPrayer,
  updatePrayerDetails,
  updatePrayerType,
} from "../lib/api";
import { getSocket } from "../lib/socket";
import { PRAYER_TYPE_LABELS } from "../lib/prayerTypes";
import { getSeekerToken } from "../lib/storage";
import { useGeolocation } from "../lib/useGeolocation";
import type { OwnedPrayer, Prayer, PrayerType } from "../types";

export function CreateMinyan() {
  const seekerToken = useMemo(() => getSeekerToken(), []);
  const geo = useGeolocation();

  const [checked, setChecked] = useState(false);
  const [myPrayer, setMyPrayer] = useState<OwnedPrayer | null>(null);
  const [details, setDetails] = useState("");
  const [prayerType, setPrayerType] = useState<PrayerType>("SHACHARIT");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detailsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getMyPrayer(seekerToken)
      .then((p) => {
        setMyPrayer(p);
        setDetails(p.details);
      })
      .catch((err) => {
        if (!(err instanceof NotFoundError)) setError(err.message);
      })
      .finally(() => setChecked(true));
  }, [seekerToken]);

  useEffect(() => {
    const socket = getSocket();
    const onUpdate = (p: Prayer) => {
      setMyPrayer((prev) => (prev && prev.id === p.id ? { ...prev, ...p } : prev));
    };
    const onRemove = ({ id }: { id: string }) => {
      setMyPrayer((prev) => (prev && prev.id === id ? null : prev));
    };
    socket.on("prayer:update", onUpdate);
    socket.on("prayer:remove", onRemove);
    return () => {
      socket.off("prayer:update", onUpdate);
      socket.off("prayer:remove", onRemove);
    };
  }, []);

  const handleCreate = async () => {
    if (!geo.location) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createPrayer({
        lat: geo.location.lat,
        lng: geo.location.lng,
        details: "",
        prayerType,
        seekerToken,
      });
      setMyPrayer(created);
      setDetails(created.details);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create minyan");
    } finally {
      setCreating(false);
    }
  };

  const handleEnd = async () => {
    if (!myPrayer) return;
    await deletePrayer(myPrayer.id, seekerToken);
    setMyPrayer(null);
    setDetails("");
  };

  const handlePresentDelta = async (delta: number) => {
    if (!myPrayer) return;
    const updated = await adjustPresentCount(myPrayer.id, seekerToken, delta);
    setMyPrayer(updated);
  };

  const handlePrayerTypeChange = async (value: PrayerType) => {
    if (!myPrayer) return;
    setMyPrayer({ ...myPrayer, prayerType: value });
    const updated = await updatePrayerType(myPrayer.id, seekerToken, value);
    setMyPrayer(updated);
  };

  const handleStart = async () => {
    if (!myPrayer) return;
    const updated = await startPrayer(myPrayer.id, seekerToken);
    setMyPrayer(updated);
  };

  const handleDetailsChange = (value: string) => {
    setDetails(value);
    if (!myPrayer) return;
    if (detailsSaveTimer.current) clearTimeout(detailsSaveTimer.current);
    detailsSaveTimer.current = setTimeout(async () => {
      const updated = await updatePrayerDetails(myPrayer.id, seekerToken, value);
      setMyPrayer(updated);
    }, 600);
  };

  return (
    <div className="page page-create">
      <header className="page-header">
        <Link to="/" className="back-link">
          &larr; חזרה
        </Link>
        <h2>Start a minyan</h2>
      </header>

      {error && <p className="notice notice-error">{error}</p>}
      {!checked ? (
        <p className="notice">Loading&hellip;</p>
      ) : !myPrayer ? (
        <div className="create-panel">
          {geo.error && <p className="notice">{geo.error}</p>}

          <label className="details-label" htmlFor="prayerType">
            תפילה
          </label>
          <select
            id="prayerType"
            value={prayerType}
            onChange={(e) => setPrayerType(e.target.value as PrayerType)}
          >
            {Object.entries(PRAYER_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <button
            className="big-button big-button-primary"
            disabled={!geo.location || creating}
            onClick={handleCreate}
          >
            {creating ? "Creating…" : "Create new minyan"}
          </button>
        </div>
      ) : (
        <div className="active-panel">
          <label className="details-label" htmlFor="prayerType">
            Prayer
          </label>
          <select
            id="prayerType"
            value={myPrayer.prayerType}
            disabled={myPrayer.started}
            onChange={(e) => handlePrayerTypeChange(e.target.value as PrayerType)}
          >
            {Object.entries(PRAYER_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <button className="big-button big-button-danger" onClick={handleEnd}>
            End the minyan
          </button>

          <div className="counters">
            <div className="counter">
              <span className="counter-label">People present</span>
              <div className="counter-controls">
                <button onClick={() => handlePresentDelta(-1)} aria-label="Decrease present count">
                  &minus;
                </button>
                <span className="counter-value">{myPrayer.presentCount}</span>
                <button onClick={() => handlePresentDelta(1)} aria-label="Increase present count">
                  +
                </button>
              </div>
            </div>

            <div className="counter">
              <span className="counter-label">People coming</span>
              <div className="counter-controls">
                <span className="counter-value">{myPrayer.comingCount}</span>
              </div>
            </div>
          </div>

          <label className="details-label" htmlFor="details">
            Details (location, notes)
          </label>
          <textarea
            id="details"
            value={details}
            onChange={(e) => handleDetailsChange(e.target.value)}
            placeholder="e.g. Corner of Main St, look for the blue tent"
            rows={3}
          />

          <button
            className="big-button big-button-secondary"
            disabled={myPrayer.started}
            onClick={handleStart}
          >
            {myPrayer.started ? "Prayer started" : "I have a minyan – start the prayer"}
          </button>
        </div>
      )}
    </div>
  );
}
