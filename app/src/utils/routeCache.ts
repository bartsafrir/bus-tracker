// Persistent cache for computed routes (OSRM match, Valhalla walking)
// Keyed by a hash of the input coordinates. Stored in localStorage.

const CACHE_KEY = 'bt_route_cache';
const MAX_ENTRIES = 50;

interface CacheEntry {
  coords: [number, number][];
  ts: number;
}

function getCache(): Record<string, CacheEntry> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}

function saveCache(cache: Record<string, CacheEntry>) {
  // Trim to MAX_ENTRIES by removing oldest
  const entries = Object.entries(cache);
  if (entries.length > MAX_ENTRIES) {
    entries.sort((a, b) => a[1].ts - b[1].ts);
    const keep = entries.slice(entries.length - MAX_ENTRIES);
    cache = Object.fromEntries(keep);
  }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* full */ }
}

// Simple hash: first/last coord + count
function hashCoords(coords: [number, number][], profile: string): string {
  if (!coords.length) return '';
  const first = coords[0];
  const last = coords[coords.length - 1];
  return `${profile}_${first[0].toFixed(4)},${first[1].toFixed(4)}_${last[0].toFixed(4)},${last[1].toFixed(4)}_${coords.length}`;
}

export function getCachedRoute(coords: [number, number][], profile: string): [number, number][] | null {
  const key = hashCoords(coords, profile);
  if (!key) return null;
  const cache = getCache();
  const entry = cache[key];
  if (!entry) return null;
  // Expire after 7 days
  if (Date.now() - entry.ts > 7 * 86400000) return null;
  return entry.coords;
}

export function setCachedRoute(inputCoords: [number, number][], profile: string, resultCoords: [number, number][]) {
  const key = hashCoords(inputCoords, profile);
  if (!key || !resultCoords.length) return;
  const cache = getCache();
  cache[key] = { coords: resultCoords, ts: Date.now() };
  saveCache(cache);
}
