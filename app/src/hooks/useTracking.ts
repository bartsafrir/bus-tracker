import { useState, useEffect, useRef, useMemo } from 'react';
import { apiFetch } from '../api/client';
import { getOperatorColor } from '../utils/operators';
import { toIsraelTime, today } from '../utils/time';
import { distanceM } from '../utils/geo';
import { latestPerVehicle, extractCitiesSmart } from '../utils/routes';
import { getRoute } from '../utils/polyline';
import { getCachedRoute, setCachedRoute } from '../utils/routeCache';
import { removeLoops } from '../utils/removeLoops';
import type { Position } from '../types';

interface LogUsageFn {
  (line: { lineName: string; lineRef: number; agencyName: string; from: string; to: string }): void;
}

export function useTracking(savedLoc: Position | null, logUsage: LogUsageFn) {
  // ─── Tracking state ───
  const [tracked, setTracked] = useState<any>(null);
  const [showDirPicker, setShowDirPicker] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [walkRoute, setWalkRoute] = useState<[number, number][] | null>(null);
  const [closestStop, setClosestStop] = useState<any>(null);
  const [selectedStop, setSelectedStop] = useState<any>(null);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[] | null>(null);
  const [opColor, setOpColor] = useState('#00A651');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [fitTrigger, setFitTrigger] = useState(0);

  const vehicleTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Derived ───
  const fitCoords = useMemo(() => {
    const c: [number, number][] = [...routeCoords];
    vehicles.forEach(v => c.push([v.lat, v.lon]));
    if (savedLoc) c.push([savedLoc.lat, savedLoc.lon]);
    return c;
  }, [routeCoords, vehicles, savedLoc]);

  // ═══ TRACK LINE ═══
  async function startTracking(lineName: string, lineRefs: number[], agencyName: string, dirFrom?: string, dirTo?: string, siblings?: any) {
    setShowDirPicker(false);
    setLoading(true);
    setLoadingMsg('טוען מסלול...');
    const color = getOperatorColor(agencyName);
    setOpColor(color.bg);
    setTracked({ lineName, lineRefs, agencyName, from: dirFrom || '', to: dirTo || '', siblings: siblings || null, operatorRef: null });
    logUsage({ lineName, lineRef: lineRefs[0], agencyName, from: dirFrom || '', to: dirTo || '' });
    setVehicles([]);
    setStops([]);
    setRouteCoords([]);
    setWalkRoute(null);
    setClosestStop(null);
    setSelectedStop(null);
    setScheduleData(null);
    setSchedule(null);
    if (vehicleTimer.current !== null) clearInterval(vehicleTimer.current);

    try {
      // Get today's route ID
      const todayRoutes = await apiFetch('/gtfs_routes/list', { line_refs: lineRefs[0], date: today(), limit: 1, order_by: 'date desc' });
      const routeId = todayRoutes[0]?.id || null;
      const operatorRef = todayRoutes[0]?.operator_ref || null;
      if (operatorRef) setTracked(prev => prev ? { ...prev, operatorRef } : prev);

      // Get one ride for stops
      const rides = await apiFetch('/gtfs_rides/list', routeId ? { gtfs_route_id: routeId, limit: 1 } : { gtfs_route__line_refs: lineRefs[0], limit: 1 });
      if (rides.length) {
        const rideStops = await apiFetch('/gtfs_ride_stops/list', { gtfs_ride_ids: rides[0].id, limit: 200 });
        const sorted = rideStops.filter(s => s.gtfs_stop__lat && s.gtfs_stop__lon).sort((a, b) => a.stop_sequence - b.stop_sequence);
        setStops(sorted);
        const stopCoords: [number, number][] = sorted.map(s => [s.gtfs_stop__lat, s.gtfs_stop__lon] as [number, number]);
        setRouteCoords(stopCoords);
        setFitTrigger(t => t + 1);
        // Get route geometry: try OSM first (exact), fall back to OSRM
        (async () => {
          const cached = getCachedRoute(stopCoords, 'bus');
          if (cached) { setRouteCoords(cached); return; }

          // Try 1: OpenStreetMap — exact bus route geometry from community mapping
          try {
            const lats = stopCoords.map(c => c[0]), lons = stopCoords.map(c => c[1]);
            const bbox = `${Math.min(...lats)-0.01},${Math.min(...lons)-0.01},${Math.max(...lats)+0.01},${Math.max(...lons)+0.01}`;
            const query = `[out:json][timeout:15];relation["route"="bus"]["ref"="${lineName}"](${bbox});out geom;`;
            const osmRes = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
            const osmData = await osmRes.json();
            let bestCoords: [number, number][] | null = null, bestDist = Infinity;
            for (const el of osmData.elements || []) {
              const coords: [number, number][] = [];
              for (const m of el.members || []) {
                if (m.type === 'way' && m.geometry) for (const pt of m.geometry) coords.push([pt.lat, pt.lon] as [number, number]);
              }
              if (coords.length > 10) {
                const d = distanceM(coords[0][0], coords[0][1], stopCoords[0][0], stopCoords[0][1]);
                if (d < bestDist) { bestDist = d; bestCoords = coords; }
              }
            }
            if (bestCoords && bestDist < 500) {
              setRouteCoords(bestCoords);
              setCachedRoute(stopCoords, 'bus', bestCoords);
              return;
            }
          } catch { /* OSM failed */ }

          // Try 2: OSRM route with loop removal
          try {
            const pts = stopCoords.map(c => `${c[1]},${c[0]}`).join(';');
            const approaches = stopCoords.map(() => 'unrestricted').join(';');
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pts}?overview=full&geometries=geojson&continue_straight=true&approaches=${approaches}`);
            const data = await res.json();
            if (data.routes?.[0]?.geometry?.coordinates) {
              const raw = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
              const clean = removeLoops(raw, stopCoords);
              setRouteCoords(clean);
              setCachedRoute(stopCoords, 'bus', clean);
            }
          } catch { /* keep straight lines */ }
        })();

        const refStart = rides[0].start_time ? new Date(rides[0].start_time).getTime() : null;
        const offsets = new Map();
        for (const s of sorted) {
          if (s.arrival_time && s.gtfs_stop_id && refStart) {
            offsets.set(s.gtfs_stop_id, { offsetMs: new Date(s.arrival_time).getTime() - refStart, shapeDist: s.shape_dist_traveled });
          }
        }
        setScheduleData({ stopOffsets: offsets, todayGtfsRouteId: routeId, referenceRideStart: refStart });
      }

      // Fetch siblings
      if (!siblings) {
        try {
          const allRoutes = await apiFetch('/gtfs_routes/list', { route_short_name: lineName, date: today(), limit: 200, order_by: 'date desc' });
          const td = today();
          const seen = new Set();
          const sibs = allRoutes
            .filter(r => r.date === td && r.agency_name === agencyName && !seen.has(r.line_ref) && (seen.add(r.line_ref), true))
            .map(r => {
              const c = extractCitiesSmart(r.route_long_name);
              return { lineRef: r.line_ref, from: c.from, to: c.to, direction: r.route_direction, alternative: r.route_alternative };
            });
          if (sibs.length > 1) setTracked(prev => prev ? { ...prev, siblings: sibs } : prev);
        } catch { /* non-critical */ }
      }

      // Fetch vehicles
      await refreshVehicles(lineRefs);
      vehicleTimer.current = setInterval(() => refreshVehicles(lineRefs), 10000);
    } catch (e) { console.error('Track:', e); }
    setLoading(false);
  }

  // ─── Refresh on app resume (iOS background → foreground) ───
  useEffect(() => {
    function onResume() {
      if (document.visibilityState === 'visible' && tracked?.lineRefs?.length) {
        refreshVehicles(tracked.lineRefs);
      }
    }
    document.addEventListener('visibilitychange', onResume);
    return () => document.removeEventListener('visibilitychange', onResume);
  }, [tracked]);

  // ─── Closest stop by walking distance ───
  useEffect(() => {
    if (!savedLoc || !stops.length) return;
    let cancelled = false;

    const byDist = stops
      .map(s => ({ s, d: distanceM(savedLoc.lat, savedLoc.lon, s.gtfs_stop__lat, s.gtfs_stop__lon) }))
      .sort((a, b) => a.d - b.d);

    setClosestStop(byDist[0]?.s || null);

    async function calcWalkDist() {
      const candidates = byDist.slice(0, 15);
      if (candidates.length < 2) return;

      const sources = [{ lat: savedLoc!.lat, lon: savedLoc!.lon }];
      const targets = candidates.map(r => ({ lat: r.s.gtfs_stop__lat, lon: r.s.gtfs_stop__lon }));
      const body = JSON.stringify({ sources, targets, costing: 'pedestrian' });

      try {
        const res = await fetch(`https://valhalla1.openstreetmap.de/sources_to_targets?json=${encodeURIComponent(body)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.sources_to_targets?.[0]) return;

        const times = data.sources_to_targets[0];
        let bestIdx = -1, bestTime = Infinity;
        for (let i = 0; i < times.length; i++) {
          const t = times[i].time;
          if (t != null && t > 0 && t < bestTime) { bestTime = t; bestIdx = i; }
        }
        if (bestIdx >= 0) {
          setClosestStop(candidates[bestIdx].s);
        }
      } catch (e) { /* keep straight-line pick */ }
    }
    calcWalkDist();
    return () => { cancelled = true; };
  }, [savedLoc, stops]);

  // ─── Walk route to closest stop ───
  useEffect(() => {
    if (!savedLoc || !closestStop) { setWalkRoute(null); return; }
    let cancelled = false;
    const walkCoords: [number, number][] = [[savedLoc.lat, savedLoc.lon], [closestStop.gtfs_stop__lat, closestStop.gtfs_stop__lon]];
    const cached = getCachedRoute(walkCoords, 'foot');
    if (cached) { setWalkRoute(cached); return; }
    setWalkRoute(null);
    getRoute(walkCoords, 'foot')
      .then(path => { if (!cancelled && path) { setWalkRoute(path); setCachedRoute(walkCoords, 'foot', path); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [savedLoc, closestStop]);

  // ─── Refresh vehicles ───
  async function refreshVehicles(lineRefs) {
    let refs = lineRefs || tracked?.lineRefs;
    if (!refs?.length) return;
    const sibs = tracked?.siblings;
    if (sibs) {
      const allRefs = new Set(refs);
      const currentDir = sibs.find(s => refs.includes(s.lineRef))?.direction;
      if (currentDir) {
        for (const s of sibs) if (s.direction === currentDir) allRefs.add(s.lineRef);
      }
      refs = [...allRefs];
    }
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 5 * 60000);
      const results = await Promise.allSettled(refs.map(lr =>
        apiFetch('/siri_vehicle_locations/list', {
          siri_routes__line_ref: lr,
          recorded_at_time_from: from.toISOString(),
          recorded_at_time_to: now.toISOString(),
          limit: 100,
        })
      ));
      const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      setVehicles(latestPerVehicle(all));
    } catch (e) { console.error('Vehicles:', e); }
  }

  // ═══ SCHEDULE ═══
  async function openSchedule(stop) {
    setSelectedStop(stop);
    setSchedule(null);

    const stopId = stop.gtfs_stop_id;
    const info = scheduleData?.stopOffsets?.get(stopId);
    if (!info || !scheduleData?.todayGtfsRouteId) {
      // Still show schedule from GTFS rides even without stop offsets
      try {
        const routeId = scheduleData?.todayGtfsRouteId;
        if (!routeId) { setSchedule([]); return; }
        const allRides = await apiFetch('/gtfs_rides/list', { gtfs_route_id: routeId, limit: 200, order_by: 'start_time asc' });
        const seen = new Set();
        const nowMs = Date.now();
        const arr = allRides
          .filter(r => r.start_time && !seen.has(r.start_time) && (seen.add(r.start_time), true))
          .map(r => {
            const ms = new Date(r.start_time).getTime();
            const il = toIsraelTime(new Date(ms));
            return { ...il, diffMin: Math.round((ms - nowMs) / 60000), arrivalMs: ms, live: null, liveEta: null, passed: false, stopsAway: null, cancelled: false, delayMin: 0 };
          })
          .sort((a, b) => a.arrivalMs - b.arrivalMs);
        setSchedule(arr);
      } catch { setSchedule([]); }
      return;
    }

    try {
      const routeIds = [scheduleData.todayGtfsRouteId];
      if (tracked?.siblings) {
        const currentDir = tracked.siblings.find(s => tracked.lineRefs.includes(s.lineRef))?.direction;
        if (currentDir) {
          const sibRefs = tracked.siblings.filter(s => s.direction === currentDir).map(s => s.lineRef);
          const sibRoutes = await apiFetch('/gtfs_routes/list', { line_refs: sibRefs.join(','), date: today(), limit: 50, order_by: 'date desc' });
          const todayDate = today();
          for (const r of sibRoutes) {
            if (r.date === todayDate && !routeIds.includes(r.id)) routeIds.push(r.id);
          }
        }
      }

      const allRides = (await Promise.allSettled(
        routeIds.map(rid => apiFetch('/gtfs_rides/list', { gtfs_route_id: rid, limit: 200, order_by: 'start_time asc' }))
      )).flatMap(r => r.status === 'fulfilled' ? r.value : []);

      // Also try fetching next 3 days' rides (for Shabbat → Sunday gaps)
      const allLineRefs = [...new Set([...(tracked?.siblings?.map(s => s.lineRef) || []), ...(tracked?.lineRefs || [])])];
      for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
        const futureDay = new Date(Date.now() + dayOffset * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
        try {
          const futureRoutes = await apiFetch('/gtfs_routes/list', { line_refs: allLineRefs.join(','), date: futureDay, limit: 50, order_by: 'date desc' });
          const futureIds = futureRoutes.filter(r => r.date === futureDay).map(r => r.id);
          if (futureIds.length) {
            const futureRides = (await Promise.allSettled(
              futureIds.map(rid => apiFetch('/gtfs_rides/list', { gtfs_route_id: rid, limit: 200, order_by: 'start_time asc' }))
            )).flatMap(r => r.status === 'fulfilled' ? r.value : []);
            allRides.push(...futureRides);
            break;
          }
        } catch { /* continue */ }
      }

      // Deduplicate by start_time
      const seen = new Set();
      const starts = allRides
        .filter(r => r.start_time)
        .filter(r => { const k = r.start_time; if (seen.has(k)) return false; seen.add(k); return true; })
        .map(r => new Date(r.start_time).getTime())
        .sort((a, b) => a - b);

      // Match live vehicles to schedule
      const liveByStart = new Map();
      for (const v of vehicles) {
        if (v.siri_ride__scheduled_start_time) {
          const key = v.siri_ride__scheduled_start_time.substring(11, 16);
          if (!liveByStart.has(key)) liveByStart.set(key, v);
        }
      }

      // Fetch rides_execution for cancellation/delay detection
      const executionMap = new Map<string, { actual: string | null; delayMin: number; cancelled: boolean }>();
      if (tracked?.operatorRef) {
        try {
          const todayDate = today();
          const allExecLineRefs = [...new Set([...(tracked?.siblings?.map(s => s.lineRef) || []), ...(tracked?.lineRefs || [])])];
          const execResults = await Promise.allSettled(
            allExecLineRefs.map(lr =>
              apiFetch('/rides_execution/list', { date_from: todayDate, date_to: todayDate, operator_ref: tracked.operatorRef, line_ref: lr, limit: 200 })
            )
          );
          for (const r of execResults) {
            if (r.status !== 'fulfilled') continue;
            for (const ex of r.value) {
              if (!ex.planned_start_time) continue;
              const key = ex.planned_start_time.substring(11, 16); // HH:MM
              const plannedMs = new Date(ex.planned_start_time).getTime();
              const actualMs = ex.actual_start_time ? new Date(ex.actual_start_time).getTime() : null;
              const cancelled = !actualMs && plannedMs < Date.now() - 5 * 60000; // null + past = cancelled
              const delayMin = actualMs ? Math.round((actualMs - plannedMs) / 60000) : 0;
              executionMap.set(key, { actual: ex.actual_start_time, delayMin, cancelled });
            }
          }
        } catch { /* non-critical */ }
      }

      const nowMs = Date.now();
      const arr = starts.map(ms => {
        const arrivalMs = ms + info.offsetMs;
        const arrUTC = new Date(arrivalMs);
        const il = toIsraelTime(arrUTC);
        const diffMin = Math.round((arrivalMs - nowMs) / 60000);
        const key = new Date(ms).toISOString().substring(11, 16);
        const live = liveByStart.get(key) || null;
        let liveEtaVal: number | null = null, passed = false, stopsAway: number | null = null;
        if (live) {
          const result = calcScheduleEta(live, stop);
          if (result?.passed) passed = true;
          else if (result?.eta) { liveEtaVal = result.eta; stopsAway = result.stopsAway; }
        }
        // Merge cancellation/delay data
        const exec = executionMap.get(key);
        const cancelled = exec?.cancelled || false;
        const delayMin = exec?.delayMin || 0;
        return { ...il, live, liveEta: liveEtaVal, passed, stopsAway, diffMin, arrivalMs, cancelled, delayMin };
      }).sort((a, b) => a.arrivalMs - b.arrivalMs);

      setSchedule(arr);
    } catch (e) { console.error('Schedule:', e); setSchedule([]); }
  }

  // ─── Recalculate schedule ETAs when vehicles update ───
  useEffect(() => {
    if (!schedule || !selectedStop || !vehicles.length) return;
    const liveByStart = new Map();
    for (const v of vehicles) {
      if (v.siri_ride__scheduled_start_time) {
        const key = v.siri_ride__scheduled_start_time.substring(11, 16);
        if (!liveByStart.has(key)) liveByStart.set(key, v);
      }
    }
    const nowMs = Date.now();
    const updated = schedule.map(item => {
      const key = new Date(item.arrivalMs - (scheduleData?.stopOffsets?.get(selectedStop.gtfs_stop_id)?.offsetMs || 0)).toISOString().substring(11, 16);
      const live = liveByStart.get(key) || item.live;
      let liveEta: number | null = null, passed = item.passed, stopsAway: number | null = null;
      if (live) {
        const result = calcScheduleEta(live, selectedStop);
        if (result?.passed) passed = true;
        else if (result?.eta) { liveEta = result.eta; stopsAway = result.stopsAway; }
      }
      const diffMin = Math.round((item.arrivalMs - nowMs) / 60000);
      return { ...item, live, liveEta, passed, stopsAway, diffMin };
    });
    setSchedule(updated);
  }, [vehicles]);

  // ═══ GO HOME ═══
  function goHome() {
    setTracked(null);
    setVehicles([]);
    setStops([]);
    setRouteCoords([]);
    setWalkRoute(null);
    setSelectedStop(null);
    setSchedule(null);
    if (vehicleTimer.current !== null) clearInterval(vehicleTimer.current);
  }

  // ═══ SMART ETA ═══
  // Uses distance_from_journey_start + schedule offsets + data age.
  // No velocity extrapolation — velocity is too noisy to trust.

  // Find bus position along route by distance_from_journey_start vs shape_dist_traveled
  function findBusStopIndex(vehicle) {
    if (!stops.length) return -1;
    const busDist = vehicle.distance_from_journey_start;

    // Distance-based: find last stop the bus has passed
    if (busDist != null && busDist > 0) {
      let bestIdx = 0;
      for (let i = 0; i < stops.length; i++) {
        const sd = scheduleData?.stopOffsets?.get(stops[i].gtfs_stop_id)?.shapeDist;
        if (sd != null && sd <= busDist) bestIdx = i;
        else if (sd != null && sd > busDist) break;
      }
      return bestIdx;
    }

    // Fallback: GPS nearest stop
    let minD = Infinity, idx = -1;
    for (let i = 0; i < stops.length; i++) {
      const d = distanceM(vehicle.lat, vehicle.lon, stops[i].gtfs_stop__lat, stops[i].gtfs_stop__lon);
      if (d < minD) { minD = d; idx = i; }
    }
    return idx;
  }

  function calcScheduleEta(vehicle, targetStop) {
    if (!stops.length || !scheduleData?.stopOffsets) return null;

    const busIdx = findBusStopIndex(vehicle);
    if (busIdx < 0) return null;

    const targetIdx = stops.findIndex(s => s.id === targetStop.id);
    if (targetIdx < 0) return null;

    if (busIdx >= targetIdx) return { passed: true };

    const busStopId = stops[busIdx].gtfs_stop_id;
    const targetStopId = targetStop.gtfs_stop_id;
    const busOffset = scheduleData.stopOffsets.get(busStopId);
    const targetOffset = scheduleData.stopOffsets.get(targetStopId);
    if (!busOffset || !targetOffset) return null;

    // Schedule says it takes this long from bus's last passed stop to target
    const scheduleEta = (targetOffset.offsetMs - busOffset.offsetMs) / 60000;
    if (scheduleEta <= 0) return { passed: true };
    if (scheduleEta > 90) return null;

    // Subtract data age: bus has been moving since the reading
    // The schedule time includes the segment the bus is currently on,
    // but the bus has already been traveling for `ageSec` since passing that stop
    let dataAgeMin = 0;
    if (vehicle.recorded_at_time) {
      const ageSec = (Date.now() - new Date(vehicle.recorded_at_time).getTime()) / 1000;
      if (ageSec > 0 && ageSec < 300) dataAgeMin = ageSec / 60;
    }

    const eta = Math.max(0, Math.round(scheduleEta - dataAgeMin));
    if (eta <= 0) return { passed: true };

    const stopsAway = targetIdx - busIdx;
    return { eta, stopsAway };
  }

  // Best live ETA for closest stop
  let liveEta: number | null = null;
  let liveStopsAway: number | null = null;
  if (vehicles.length && closestStop) {
    for (const v of vehicles) {
      const result = calcScheduleEta(v, closestStop);
      if (!result || result.passed) continue;
      if (result.eta && (!liveEta || result.eta < liveEta)) {
        liveEta = result.eta;
        liveStopsAway = result.stopsAway;
      }
    }
  }

  // Walking time to closest stop
  let walkMin: number | null = null;
  let walkDist: number | null = null;
  if (savedLoc && closestStop) {
    walkDist = distanceM(savedLoc.lat, savedLoc.lon, closestStop.gtfs_stop__lat, closestStop.gtfs_stop__lon);
    walkMin = Math.max(1, Math.round((walkDist * 1.2) / 83));
  }

  return {
    // State
    tracked, vehicles, stops, routeCoords, walkRoute,
    closestStop, selectedStop, schedule, scheduleData,
    opColor, showDirPicker, fitCoords, fitTrigger,
    // Derived
    liveEta, liveStopsAway, walkMin, walkDist,
    // Actions
    startTracking, openSchedule, goHome,
    setShowDirPicker, setSelectedStop,
    // Loading
    loading, loadingMsg,
  };
}
