import { useQuery } from '@tanstack/react-query';

const API = 'https://open-bus-stride-api.hasadna.org.il';

async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${API}${endpoint}`);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, String(v));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  } finally { clearTimeout(t); }
}

// ─── GTFS route stops + path (permanent, cached forever per ride) ───
export function useRouteStops(gtfsRouteId) {
  return useQuery({
    queryKey: ['routeStops', gtfsRouteId],
    queryFn: async () => {
      if (!gtfsRouteId) return null;
      const rides = await apiFetch('/gtfs_rides/list', { gtfs_route_id: gtfsRouteId, limit: 1 });
      if (!rides.length) return null;
      const stops = await apiFetch('/gtfs_ride_stops/list', { gtfs_ride_ids: rides[0].id, limit: 200 });
      const sorted = stops
        .filter(s => s.gtfs_stop__lat && s.gtfs_stop__lon)
        .sort((a, b) => a.stop_sequence - b.stop_sequence);

      const refStart = rides[0].start_time ? new Date(rides[0].start_time).getTime() : null;
      const offsets = new Map();
      for (const s of sorted) {
        if (s.arrival_time && s.gtfs_stop_id && refStart) {
          offsets.set(s.gtfs_stop_id, { offsetMs: new Date(s.arrival_time).getTime() - refStart, shapeDist: s.shape_dist_traveled });
        }
      }

      return { stops: sorted, offsets, ride: rides[0], refStart };
    },
    enabled: !!gtfsRouteId,
    staleTime: Infinity, // stops don't change
    gcTime: 30 * 60 * 1000, // keep in cache 30 min
  });
}

// ─── Today's GTFS route ID for a line_ref (cached per day) ───
export function useTodayRouteId(lineRef, todayStr) {
  return useQuery({
    queryKey: ['todayRoute', lineRef, todayStr],
    queryFn: async () => {
      if (!lineRef) return null;
      const routes = await apiFetch('/gtfs_routes/list', { line_refs: lineRef, date: todayStr, limit: 1, order_by: 'date desc' });
      return routes[0]?.id || null;
    },
    enabled: !!lineRef && !!todayStr,
    staleTime: 60 * 60 * 1000, // 1 hour — same day
    gcTime: 2 * 60 * 60 * 1000,
  });
}

// ─── GTFS rides for schedule (cached per route ID) ───
export function useScheduleRides(routeIds) {
  const key = routeIds?.sort().join(',') || '';
  return useQuery({
    queryKey: ['scheduleRides', key],
    queryFn: async () => {
      if (!routeIds?.length) return [];
      const allRides = (await Promise.allSettled(
        routeIds.map(rid => apiFetch('/gtfs_rides/list', { gtfs_route_id: rid, limit: 200, order_by: 'start_time asc' }))
      )).flatMap(r => r.status === 'fulfilled' ? r.value : []);

      const seen = new Set();
      return allRides
        .filter(r => r.start_time)
        .filter(r => { const k = r.start_time; if (seen.has(k)) return false; seen.add(k); return true; })
        .map(r => ({ startMs: new Date(r.start_time).getTime(), startTime: r.start_time }))
        .sort((a, b) => a.startMs - b.startMs);
    },
    enabled: !!routeIds?.length,
    staleTime: 30 * 60 * 1000, // 30 min
    gcTime: 60 * 60 * 1000,
  });
}

// ─── Search results (cached per search term + date) ───
export function useSearchRoutes(lineName, todayStr) {
  return useQuery({
    queryKey: ['search', lineName, todayStr],
    queryFn: () => apiFetch('/gtfs_routes/list', { route_short_name: lineName, date: todayStr, limit: 200, order_by: 'date desc' }),
    enabled: !!lineName && !!todayStr,
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Route hours enrichment (cached per route ID) ───
export function useRouteHours(gtfsRouteId) {
  return useQuery({
    queryKey: ['routeHours', gtfsRouteId],
    queryFn: async () => {
      const [first, last] = await Promise.all([
        apiFetch('/gtfs_rides/list', { gtfs_route_id: gtfsRouteId, limit: 1, order_by: 'start_time asc' }),
        apiFetch('/gtfs_rides/list', { gtfs_route_id: gtfsRouteId, limit: 1, order_by: 'start_time desc' }),
      ]);
      const allR = await apiFetch('/gtfs_rides/list', { gtfs_route_id: gtfsRouteId, limit: 200 });
      return {
        firstTime: first[0]?.start_time || null,
        lastTime: last[0]?.start_time || null,
        rideCount: allR.filter(r => r.start_time).length,
      };
    },
    enabled: !!gtfsRouteId,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000,
  });
}

// ─── Siblings (all same-operator directions, cached per line+operator+date) ───
export function useSiblings(lineName, agencyName, todayStr) {
  return useQuery({
    queryKey: ['siblings', lineName, agencyName, todayStr],
    queryFn: async () => {
      const allRoutes = await apiFetch('/gtfs_routes/list', { route_short_name: lineName, date: todayStr, limit: 200, order_by: 'date desc' });
      const seen = new Set();
      return allRoutes
        .filter(r => r.date === todayStr && r.agency_name === agencyName && !seen.has(r.line_ref) && (seen.add(r.line_ref), true))
        .map(r => ({ lineRef: r.line_ref, direction: r.route_direction, alternative: r.route_alternative, routeLongName: r.route_long_name, gtfsRouteId: r.id }));
    },
    enabled: !!lineName && !!agencyName && !!todayStr,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

// Re-export apiFetch for direct use
export { apiFetch as api };
