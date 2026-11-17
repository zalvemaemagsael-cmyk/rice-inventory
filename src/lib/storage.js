import { emptyData } from "../data/emptyData.js";

const STORAGE_KEY = "rice-inventory-data";

// Persists to the browser's localStorage, so data survives refreshes and
// restarts on the same machine/browser. This is a single-user, single-device
// store - if you need multiple people or devices to share one inventory,
// swap this module out for a real backend (see README.md).

export function loadData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Data saved by an older version of the app may be missing lists that
    // were added later (e.g. palaySales); fill those in as empty so nothing
    // downstream crashes on `undefined.reduce(...)`.
    for (const [key, value] of Object.entries(emptyData())) {
      if (Array.isArray(value) && !Array.isArray(parsed[key])) parsed[key] = [];
    }
    return parsed;
  } catch (e) {
    console.error("Failed to load inventory data", e);
    return null;
  }
}

export function saveData(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Failed to save inventory data", e);
    return false;
  }
}
