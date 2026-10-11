import { useEffect, useState } from "react";

export interface GeoState {
  location: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
}

/** Fallback used only if the browser can't/won't provide a location: Jerusalem. */
const FALLBACK_LOCATION = { lat: 31.7683, lng: 35.2137 };

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({ location: null, error: null, loading: true });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ location: FALLBACK_LOCATION, error: "Geolocation is not supported by this browser.", loading: false });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
          loading: false,
        });
      },
      (err) => {
        setState({
          location: FALLBACK_LOCATION,
          error: `Couldn't get your location (${err.message}). Showing Jerusalem instead.`,
          loading: false,
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return state;
}
