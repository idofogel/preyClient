declare global {
  interface Window {
    __APP_CONFIG__?: { API_URL?: string };
  }
}

// Runtime value (served as /config.js) wins over the build-time one, so a
// built bundle can be pointed at any server without rebuilding.
const raw =
  window.__APP_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || "http://localhost:4000";

export const API_URL = raw.replace(/\/+$/, "");
