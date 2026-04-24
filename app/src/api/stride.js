const API = 'https://open-bus-stride-api.hasadna.org.il';

export async function apiFetch(endpoint, params = {}, timeoutMs = 12000) {
  const url = new URL(`${API}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Closed time window for fast vehicle location queries
function timeWindow(minutesBack = 5) {
  const now = new Date();
  return {
    from: new Date(now.getTime() - minutesBack * 60 * 1000).toISOString(),
    to: now.toISOString(),
  };
}

// ── Routes ──

export async function searchRoutes(lineNumber) {
  return apiFetch('/gtfs_routes/list', {
    route_short_name: lineNumber,
    date: todayStr(),
    limit: 100,
    order_by: 'date desc',
  });
}

export async function getRouteRides(gtfsRouteId, { limit = 200, order } = {}) {
  return apiFetch('/gtfs_rides/list', {
    gtfs_route_id: gtfsRouteId,
    limit,
    ...(order ? { order_by: `start_time ${order}` } : {}),
  });
}

// ── Vehicle Locations ──

export async function getVehicleLocations(lineRef, minutesBack = 5) {
  const w = timeWindow(minutesBack);
  return apiFetch('/siri_vehicle_locations/list', {
    siri_routes__line_ref: lineRef,
    recorded_at_time_from: w.from,
    recorded_at_time_to: w.to,
    limit: 100,
  });
}

export async function getNearbyVehicles(lat, lon, radiusKm = 1.5, minutesBack = 5) {
  const offset = radiusKm / 111;
  const w = timeWindow(minutesBack);
  return apiFetch('/siri_vehicle_locations/list', {
    lat__greater_or_equal: lat - offset,
    lat__lower_or_equal: lat + offset,
    lon__greater_or_equal: lon - offset,
    lon__lower_or_equal: lon + offset,
    recorded_at_time_from: w.from,
    recorded_at_time_to: w.to,
    limit: 200,
  });
}

// ── Ride Stops (for route path + schedule) ──

export async function getRideStops(gtfsRideId) {
  return apiFetch('/gtfs_ride_stops/list', { gtfs_ride_ids: gtfsRideId, limit: 200 });
}

// ── Enrichment: operating hours ──

export async function getRouteHours(gtfsRouteId) {
  const [first, last] = await Promise.all([
    apiFetch('/gtfs_rides/list', { gtfs_route_id: gtfsRouteId, limit: 1, order_by: 'start_time asc' }),
    apiFetch('/gtfs_rides/list', { gtfs_route_id: gtfsRouteId, limit: 1, order_by: 'start_time desc' }),
  ]);
  const allRides = await apiFetch('/gtfs_rides/list', { gtfs_route_id: gtfsRouteId, limit: 200 });
  const count = allRides.filter(r => r.start_time).length;
  return {
    firstTime: first[0]?.start_time || null,
    lastTime: last[0]?.start_time || null,
    rideCount: count,
  };
}
