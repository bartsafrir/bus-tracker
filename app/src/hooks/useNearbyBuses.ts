import { useState, useCallback, useEffect, useRef } from 'react';
import { apiFetch } from '../api/client';
import { latestPerVehicle, extractCitiesSmart } from '../utils/routes';
import { distanceM } from '../utils/geo';
import { today } from '../utils/time';
import type { Position } from '../types';

export function useNearbyBuses(savedLoc: Position | null) {
  const [nearbyBuses, setNearbyBuses] = useState<any[]>([]);
  const nearbyTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadNearby = useCallback(async () => {
    if (!savedLoc) return;
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 5 * 60000);
      const offset = 1.5 / 111;
      const locs = await apiFetch('/siri_vehicle_locations/list', {
        lat__greater_or_equal: savedLoc.lat - offset,
        lat__lower_or_equal: savedLoc.lat + offset,
        lon__greater_or_equal: savedLoc.lon - offset,
        lon__lower_or_equal: savedLoc.lon + offset,
        recorded_at_time_from: from.toISOString(),
        recorded_at_time_to: now.toISOString(),
        limit: 200,
      });
      const latest = latestPerVehicle(locs);

      // Group by line_ref, keep closest
      const byLine = new Map();
      for (const v of latest) {
        const lr = v.siri_route__line_ref;
        const dist = distanceM(savedLoc.lat, savedLoc.lon, v.lat, v.lon);
        const ex = byLine.get(lr);
        if (!ex || dist < ex.dist) byLine.set(lr, { ...v, dist });
      }
      // Resolve names
      const refs = [...byLine.keys()];
      if (!refs.length) { setNearbyBuses([]); return; }
      const chunks: number[][] = []; for (let i = 0; i < refs.length; i += 20) chunks.push(refs.slice(i, i + 20));
      const rr = await Promise.allSettled(chunks.map(c => apiFetch('/gtfs_routes/list', { line_refs: c.join(','), date: today(), limit: 200, order_by: 'date desc' })));
      const nameMap = new Map();
      for (const r of rr) if (r.status === 'fulfilled') for (const rt of r.value) if (!nameMap.has(rt.line_ref)) nameMap.set(rt.line_ref, rt);

      // Build nearby list — keep all directions (different line_refs = different directions)
      const lines = [...byLine.values()]
        .map(v => {
          const rt = nameMap.get(v.siri_route__line_ref);
          const etaMin = v.velocity > 0 ? Math.round(v.dist / (v.velocity * 1000 / 60)) : null;
          const cities = rt ? extractCitiesSmart(rt.route_long_name) : { from: '', to: '' };
          return { ...v, name: rt?.route_short_name || '?', agency: rt?.agency_name || '', etaMin, from: cities.from, to: cities.to, dir: rt?.route_direction };
        })
        .filter(v => v.etaMin == null || v.etaMin < 30)
        .sort((a, b) => (a.etaMin ?? 999) - (b.etaMin ?? 999))
        .slice(0, 8);
      setNearbyBuses(lines);
    } catch (e) { console.error('Nearby:', e); }
  }, [savedLoc]);

  useEffect(() => {
    loadNearby();
    nearbyTimer.current = setInterval(loadNearby, 30000);
    return () => { if (nearbyTimer.current !== null) clearInterval(nearbyTimer.current); };
  }, [loadNearby]);

  // Refresh on app resume (iOS background → foreground)
  useEffect(() => {
    function onResume() {
      if (document.visibilityState === 'visible') loadNearby();
    }
    document.addEventListener('visibilitychange', onResume);
    return () => document.removeEventListener('visibilitychange', onResume);
  }, [loadNearby]);

  return { nearbyBuses };
}
