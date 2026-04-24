import { useState, useEffect, useMemo } from 'react';
import type { Position } from '../types';

export function usePersistedLocation(devMode: boolean) {
  const [position, setPosition] = useState<Position | null>(() => {
    try { return JSON.parse(localStorage.getItem('bt_loc') || 'null'); } catch { return null; }
  });

  function saveLocation(lat: number, lon: number) {
    const loc = { lat, lon };
    setPosition(loc);
    localStorage.setItem('bt_loc', JSON.stringify(loc));
  }

  // Watch GPS continuously (not in dev mode)
  useEffect(() => {
    if (devMode || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => saveLocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: false, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [devMode]);

  return { position, saveLocation };
}
