export const STORAGE_KEYS = {
  SETTINGS: 'sensorsure_settings_v1',
  EVENTS: 'sensorsure_events_v1',
};

export function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`LocalStorage read error for key "${key}":`, err);
    return fallback;
  }
}

export function safeSetItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`LocalStorage write error for key "${key}":`, err);
    return false;
  }
}
