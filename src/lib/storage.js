const STORAGE_KEY = "rice-inventory-data";

// Persists to the browser's localStorage, so data survives refreshes and
// restarts on the same machine/browser. This is a single-user, single-device
// store - if you need multiple people or devices to share one inventory,
// swap this module out for a real backend (see README.md).

export function loadData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
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
