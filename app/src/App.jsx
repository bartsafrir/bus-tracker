import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { FitBoundsOnChange, FlyToLocation, MapClickHandler } from './components/Map/MapControls';
import L from 'leaflet';
import { getOperatorColor } from './utils/operators';
import { toIsraelTime } from './utils/time';
import { distanceM } from './utils/geo';
import { SearchIcon, LocationIcon, SunIcon, MoonIcon, BackIcon } from './components/Icons';
import SearchOverlay from './components/SearchOverlay';
import HomeSheet from './components/HomeSheet';
import TrackingSheet from './components/TrackingSheet';
import ScheduleSheet from './components/ScheduleSheet';
import 'leaflet/dist/leaflet.css';
import './App.css';

const API_BASE = 'https://open-bus-stride-api.hasadna.org.il';

// ─── Simple fetch with timeout (used for non-cached calls) ───
async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, String(v));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } finally { clearTimeout(t); }
}

// today() imported from utils/time

// Routing imported from utils
import { getRoute } from './utils/polyline';
import { getCachedRoute, setCachedRoute } from './utils/routeCache';

// Post-process OSRM route: remove loops, but keep loops that serve stops.
function removeLoops(path, stopCoords) {
  if (path.length < 10 || !stopCoords?.length) return path;
  const GRID = 0.0003; // ~30m
  const cellKey = (lat, lon) => `${Math.round(lat / GRID)},${Math.round(lon / GRID)}`;

  // For each detected loop, check if removing it would orphan a stop.
  // If yes, keep the loop. If no, remove it.
  const result = [];
  let i = 0;
  while (i < path.length) {
    result.push(path[i]);
    const key = cellKey(path[i][0], path[i][1]);
    let jumpTo = -1;
    for (let j = i + 10; j < Math.min(i + 150, path.length); j++) {
      if (cellKey(path[j][0], path[j][1]) === key) jumpTo = j;
    }

    if (jumpTo > 0) {
      // Found a loop from i to jumpTo. Check: would any stop be orphaned?
      // A stop is "served by the loop" if it's closer to the loop segment
      // than to the non-loop path (i.e., the remaining path without the loop).
      const loopSegment = path.slice(i, jumpTo + 1);
      let stopNeedsLoop = false;

      for (const stop of stopCoords) {
        // Distance from stop to closest point IN the loop
        let minLoopDist = Infinity;
        for (const p of loopSegment) {
          const d = distanceM(stop[0], stop[1], p[0], p[1]);
          if (d < minLoopDist) minLoopDist = d;
        }
        // Distance from stop to the junction point (where we'd skip to)
        const junctionDist = distanceM(stop[0], stop[1], path[jumpTo][0], path[jumpTo][1]);

        // If a stop is very close to the loop (<40m) and far from the junction (>80m),
        // this loop is needed to reach that stop
        if (minLoopDist < 40 && junctionDist > 80) {
          stopNeedsLoop = true;
          break;
        }
      }

      if (stopNeedsLoop) {
        // Keep the loop — don't skip
        i++;
      } else {
        // Remove the loop — skip to jumpTo
        i = jumpTo + 1;
      }
    } else {
      i++;
    }
  }
  return result.length > 1 ? result : path;
}

// ─── Leaflet icons ───
const meIcon = L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });
const stopIconSm = L.divIcon({ className: '', html: '<div class="stop-dot"></div>', iconSize: [10, 10], iconAnchor: [5, 5] });
const closestStopIcon = L.divIcon({ className: '', html: '<div class="stop-dot closest"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
const selectedStopIcon = L.divIcon({ className: '', html: '<div class="stop-dot selected"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

function makeBusIcon(bearing, color, lineNum) {
  const r = bearing ?? 0;
  // SVG navigation arrow — pointy top, flat bottom, clearly directional
  const arrow = `<svg viewBox="0 0 24 24" style="transform:rotate(${r}deg)"><path d="M12 2L4 20h3l5-6 5 6h3L12 2z"/></svg>`;
  return L.divIcon({
    className: '',
    html: `<div class="bus-chip" style="--c:${color}">
      <div class="bus-chip-body">
        <span class="bus-chip-num">${lineNum || ''}</span>
        <span class="bus-chip-dir">${arrow}</span>
      </div>
    </div>`,
    iconSize: [56, 56], iconAnchor: [28, 28],
  });
}


// Imported from utils/routes
import { latestPerVehicle } from './utils/routes';
import { today } from './utils/time';

// ═══════════════════════════════════════════
// APP
// ═══════════════════════════════════════════
export default function App() {
  // ─── Dev mode: ?dev=1 in URL allows dragging location + pin mode ───
  const devMode = useMemo(() => new URLSearchParams(window.location.search).has('dev'), []);

  // ─── Theme ───
  const [theme, setTheme] = useState(() => localStorage.getItem('bt_theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bt_theme', theme);
  }, [theme]);

  // ─── Persisted state ───
  const [savedLoc, setSavedLoc] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bt_loc')); } catch { return null; }
  });
  const [usageLog, setUsageLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bt_usage')) || []; } catch { return []; }
  });

  function saveLocation(lat, lon) {
    const loc = { lat, lon };
    setSavedLoc(loc);
    localStorage.setItem('bt_loc', JSON.stringify(loc));
  }

  // Display helper: RTL arrow between from and to
  function fmtDir(from, to) { return `${from} \u2190 ${to}`; }

  // Log usage every time a line is tracked
  function logUsage(line) {
    const now = new Date();
    const entry = {
      lineRef: line.lineRef,
      lineName: line.lineName,
      agencyName: line.agencyName,
      from: line.from || '',
      to: line.to || '',
      ts: now.getTime(),
      day: now.getDay(),
      hour: now.getHours(),
      lat: savedLoc?.lat || null,
      lon: savedLoc?.lon || null,
    };
    setUsageLog(prev => {
      const next = [entry, ...prev].slice(0, 200);
      localStorage.setItem('bt_usage', JSON.stringify(next));
      return next;
    });
  }

  // Compute smart suggestions from usage log
  function getSuggestions() {
    if (!usageLog.length) return [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const nowMs = now.getTime();

    // Score per unique lineRef
    const scores = new Map();
    for (const u of usageLog) {
      const daysAgo = (nowMs - u.ts) / 86400000;
      const recency = Math.exp(-daysAgo / 30);

      const hourDiff = Math.abs(currentHour - u.hour);
      const timeBoost = hourDiff <= 1 ? 2 : hourDiff <= 2 ? 1.3 : 1;
      const dayBoost = currentDay === u.day ? 1.5 : 1;

      let locBoost = 1;
      if (savedLoc && u.lat) {
        const dist = distanceM(savedLoc.lat, savedLoc.lon, u.lat, u.lon);
        locBoost = dist < 2000 ? 1.5 : 1;
      }

      const score = recency * timeBoost * dayBoost * locBoost;
      const existing = scores.get(u.lineRef);
      if (existing) {
        existing.score += score;
        existing.count++;
        if (u.ts > existing.lastTs) {
          existing.lastTs = u.ts;
          existing.from = u.from; existing.to = u.to;
        }
      } else {
        scores.set(u.lineRef, {
          lineRef: u.lineRef, lineName: u.lineName,
          agencyName: u.agencyName, from: u.from, to: u.to,
          score, count: 1, lastTs: u.ts,
          typicalHour: u.hour,
        });
      }
    }

    // Find typical hour per line (most common hour)
    const hourCounts = new Map();
    for (const u of usageLog) {
      const key = `${u.lineRef}_${u.hour}`;
      hourCounts.set(key, (hourCounts.get(key) || 0) + 1);
    }
    for (const [lineRef, entry] of scores) {
      let bestHour = 0, bestCount = 0;
      for (let h = 0; h < 24; h++) {
        const c = hourCounts.get(`${lineRef}_${h}`) || 0;
        if (c > bestCount) { bestCount = c; bestHour = h; }
      }
      entry.typicalHour = bestHour;
    }

    return [...scores.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  const suggestions = useMemo(getSuggestions, [usageLog, savedLoc]);
  const recentLines = useMemo(() => {
    // Unique recent lines by lineRef, ordered by last use
    const seen = new Set();
    return usageLog
      .filter(u => { if (seen.has(u.lineRef)) return false; seen.add(u.lineRef); return true; })
      .slice(0, 8)
      .map(u => ({ lineRef: u.lineRef, lineName: u.lineName, agencyName: u.agencyName, from: u.from, to: u.to }));
  }, [usageLog]);

  // ─── Nearby live buses ───
  const [nearbyBuses, setNearbyBuses] = useState([]);
  const nearbyTimer = useRef(null);

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
      const chunks = []; for (let i = 0; i < refs.length; i += 20) chunks.push(refs.slice(i, i + 20));
      const rr = await Promise.allSettled(chunks.map(c => apiFetch('/gtfs_routes/list', { line_refs: c.join(','), date: today(), limit: 200, order_by: 'date desc' })));
      const nameMap = new Map();
      for (const r of rr) if (r.status === 'fulfilled') for (const rt of r.value) if (!nameMap.has(rt.line_ref)) nameMap.set(rt.line_ref, rt);

      // Build nearby list — keep all directions (different line_refs = different directions)
      const lines = [...byLine.values()]
        .map(v => {
          const rt = nameMap.get(v.siri_route__line_ref);
          const etaMin = v.velocity > 0 ? Math.round(v.dist / (v.velocity * 1000 / 60)) : null;
          const cities = rt ? extractCities(rt.route_long_name) : { from: '', to: '' };
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
    return () => clearInterval(nearbyTimer.current);
  }, [loadNearby]);

  // ─── Live data for suggestions ───
  const [suggestionsLive, setSuggestionsLive] = useState({});

  useEffect(() => {
    if (!suggestions.length || !savedLoc) return;
    let cancelled = false;

    async function loadSuggestionsLive() {
      const data = {};
      await Promise.allSettled(suggestions.slice(0, 4).map(async s => {
        try {
          // Get live vehicles for this line
          const now = new Date();
          const from = new Date(now.getTime() - 5 * 60000);
          const locs = await apiFetch('/siri_vehicle_locations/list', {
            siri_routes__line_ref: s.lineRef,
            recorded_at_time_from: from.toISOString(),
            recorded_at_time_to: now.toISOString(),
            limit: 20,
          });
          const vehicles = latestPerVehicle(locs);

          // Get stops to find nearest stop to user
          const todayRoutes = await apiFetch('/gtfs_routes/list', { line_refs: s.lineRef, date: today(), limit: 1, order_by: 'date desc' });
          const routeId = todayRoutes[0]?.id;
          if (!routeId) return;
          const rides = await apiFetch('/gtfs_rides/list', { gtfs_route_id: routeId, limit: 1 });
          if (!rides.length) return;
          const rideStops = await apiFetch('/gtfs_ride_stops/list', { gtfs_ride_ids: rides[0].id, limit: 200 });
          const validStops = rideStops.filter(st => st.gtfs_stop__lat && st.gtfs_stop__lon).sort((a, b) => a.stop_sequence - b.stop_sequence);
          if (!validStops.length) return;

          // Find nearest stop to user
          let minD = Infinity, nearestStop = null;
          for (const st of validStops) {
            const d = distanceM(savedLoc.lat, savedLoc.lon, st.gtfs_stop__lat, st.gtfs_stop__lon);
            if (d < minD) { minD = d; nearestStop = st; }
          }

          // Find nearest vehicle approaching (simple: closest by straight line)
          let bestEta = null;
          if (vehicles.length && nearestStop) {
            const stopIdx = validStops.findIndex(st => st.id === nearestStop.id);
            for (const v of vehicles) {
              // Find which stop bus is nearest to
              let busMinD = Infinity, busIdx = -1;
              for (let i = 0; i < validStops.length; i++) {
                const d = distanceM(v.lat, v.lon, validStops[i].gtfs_stop__lat, validStops[i].gtfs_stop__lon);
                if (d < busMinD) { busMinD = d; busIdx = i; }
              }
              if (busIdx >= 0 && busIdx < stopIdx && rides[0].start_time) {
                // Bus is before our stop — estimate using schedule
                const refStart = new Date(rides[0].start_time).getTime();
                const busOff = validStops[busIdx].arrival_time ? new Date(validStops[busIdx].arrival_time).getTime() - refStart : 0;
                const stopOff = nearestStop.arrival_time ? new Date(nearestStop.arrival_time).getTime() - refStart : 0;
                const eta = Math.round((stopOff - busOff) / 60000);
                if (eta > 0 && eta < 60 && (!bestEta || eta < bestEta)) bestEta = eta;
              }
            }
          }

          if (!cancelled) {
            data[s.lineRef] = {
              liveCount: vehicles.length,
              stopName: nearestStop?.gtfs_stop__name || null,
              stopCode: nearestStop?.gtfs_stop__code || null,
              eta: bestEta,
            };
          }
        } catch (e) { /* non-critical */ }
      }));
      if (!cancelled) setSuggestionsLive(data);
    }

    loadSuggestionsLive();
    const iv = setInterval(loadSuggestionsLive, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [suggestions, savedLoc]);

  // ─── UI state ───
  const [view, setView] = useState('home'); // home | search | tracking | schedule
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [pinMode, setPinMode] = useState(false);
  const [locError, setLocError] = useState(null);
  const [flyToTrigger, setFlyToTrigger] = useState(0);
  const [fitTrigger, setFitTrigger] = useState(0);


  // Tracking state
  const [tracked, setTracked] = useState(null); // { lineName, lineRefs, agencyName, cities, siblings }
  // siblings: [{ lineRef, cities, direction, alternative }] — all directions for this operator
  const [showDirPicker, setShowDirPicker] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [stops, setStops] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]); // snapped driving route
  const [walkRoute, setWalkRoute] = useState(null); // [[lat,lon],...] walking path
  const [closestStop, setClosestStop] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [opColor, setOpColor] = useState('#00A651');

  const vehicleTimer = useRef(null);

  // ─── Derived ───
  const fitCoords = useMemo(() => {
    const c = [...routeCoords];
    vehicles.forEach(v => c.push([v.lat, v.lon]));
    if (savedLoc) c.push([savedLoc.lat, savedLoc.lon]);
    return c;
  }, [routeCoords, vehicles, savedLoc]);

  // ═══ TRACK LINE ═══
  async function startTracking(lineName, lineRefs, agencyName, dirFrom, dirTo, siblings) {
    setView('tracking');
    setShowDirPicker(false);
    setLoading(true);
    setLoadingMsg('טוען מסלול...');
    const color = getOperatorColor(agencyName);
    setOpColor(color.bg);
    setTracked({ lineName, lineRefs, agencyName, from: dirFrom || '', to: dirTo || '', siblings: siblings || null });
    logUsage({ lineName, lineRef: lineRefs[0], agencyName, from: dirFrom || '', to: dirTo || '' });
    setVehicles([]);
    setStops([]);
    setRouteCoords([]);
    setWalkRoute(null);
    setClosestStop(null);
    setSelectedStop(null);
    setScheduleData(null);
    setSchedule(null);
    clearInterval(vehicleTimer.current);

    try {
      // Get today's route ID
      const todayRoutes = await apiFetch('/gtfs_routes/list', { line_refs: lineRefs[0], date: today(), limit: 1, order_by: 'date desc' });
      const routeId = todayRoutes[0]?.id || null;

      // Get one ride for stops
      const rides = await apiFetch('/gtfs_rides/list', routeId ? { gtfs_route_id: routeId, limit: 1 } : { gtfs_route__line_refs: lineRefs[0], limit: 1 });
      if (rides.length) {
        const rideStops = await apiFetch('/gtfs_ride_stops/list', { gtfs_ride_ids: rides[0].id, limit: 200 });
        const sorted = rideStops.filter(s => s.gtfs_stop__lat && s.gtfs_stop__lon).sort((a, b) => a.stop_sequence - b.stop_sequence);
        setStops(sorted);
        const stopCoords = sorted.map(s => [s.gtfs_stop__lat, s.gtfs_stop__lon]);
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
            let bestCoords = null, bestDist = Infinity;
            for (const el of osmData.elements || []) {
              const coords = [];
              for (const m of el.members || []) {
                if (m.type === 'way' && m.geometry) for (const pt of m.geometry) coords.push([pt.lat, pt.lon]);
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
              const c = extractCities(r.route_long_name);
              return { lineRef: r.line_ref, from: c.from, to: c.to, direction: r.route_direction, alternative: r.route_alternative };
            });
          if (sibs.length > 1) setTracked(prev => prev ? { ...prev, siblings: sibs } : prev);
        } catch { /* non-critical */ }
      }

      // Fetch vehicles
      await refreshVehicles(lineRefs);
      vehicleTimer.current = setInterval(() => refreshVehicles(lineRefs), 30000);
    } catch (e) { console.error('Track:', e); }
    setLoading(false);
  }

  // Recalculate closest stop by walking distance (OSRM table API)
  useEffect(() => {
    if (!savedLoc || !stops.length) return;
    let cancelled = false;

    // Straight-line sort — always correct as immediate pick
    const byDist = stops
      .map(s => ({ s, d: distanceM(savedLoc.lat, savedLoc.lon, s.gtfs_stop__lat, s.gtfs_stop__lon) }))
      .sort((a, b) => a.d - b.d);

    setClosestStop(byDist[0]?.s || null);

    // Then: refine with OSRM walking duration
    async function calcWalkDist() {
      // Take top 15 nearest by straight line
      const candidates = byDist.slice(0, 15);
      if (candidates.length < 2) return;

      // Valhalla matrix API for pedestrian walking times
      const sources = [{ lat: savedLoc.lat, lon: savedLoc.lon }];
      const targets = candidates.map(r => ({ lat: r.s.gtfs_stop__lat, lon: r.s.gtfs_stop__lon }));
      const body = JSON.stringify({ sources, targets, costing: 'pedestrian' });

      try {
        const res = await fetch(`https://valhalla1.openstreetmap.de/sources_to_targets?json=${encodeURIComponent(body)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.sources_to_targets?.[0]) return;

        const times = data.sources_to_targets[0]; // [{time, distance}, ...]
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

  // Fetch walking route to closest stop
  useEffect(() => {
    if (!savedLoc || !closestStop) { setWalkRoute(null); return; }
    let cancelled = false;
    const walkCoords = [[savedLoc.lat, savedLoc.lon], [closestStop.gtfs_stop__lat, closestStop.gtfs_stop__lon]];
    const cached = getCachedRoute(walkCoords, 'foot');
    if (cached) { setWalkRoute(cached); return; }
    setWalkRoute(null);
    getRoute(walkCoords, 'foot')
      .then(path => { if (!cancelled && path) { setWalkRoute(path); setCachedRoute(walkCoords, 'foot', path); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [savedLoc, closestStop]);

  // Watch GPS position continuously (disabled in dev mode — manual location only)
  useEffect(() => {
    if (devMode || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => saveLocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: false, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  async function refreshVehicles(lineRefs) {
    // Include sibling line_refs (same direction, different alternatives) so we catch all buses
    let refs = lineRefs || tracked?.lineRefs;
    if (!refs?.length) return;
    const sibs = tracked?.siblings;
    if (sibs) {
      const allRefs = new Set(refs);
      // Add same-direction siblings (different alternatives of the same physical route)
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
    setView('schedule');
    setSchedule(null);

    const stopId = stop.gtfs_stop_id;
    const info = scheduleData?.stopOffsets?.get(stopId);
    if (!info || !scheduleData?.todayGtfsRouteId) return;

    try {
      // Get rides from ALL same-direction sibling route IDs (different alts)
      const routeIds = [scheduleData.todayGtfsRouteId];
      if (tracked?.siblings) {
        const currentDir = tracked.siblings.find(s => tracked.lineRefs.includes(s.lineRef))?.direction;
        if (currentDir) {
          // Get GTFS route IDs for sibling line_refs
          const sibRefs = tracked.siblings.filter(s => s.direction === currentDir).map(s => s.lineRef);
          const sibRoutes = await apiFetch('/gtfs_routes/list', { line_refs: sibRefs.join(','), date: today(), limit: 50, order_by: 'date desc' });
          const todayDate = today();
          for (const r of sibRoutes) {
            if (r.date === todayDate && !routeIds.includes(r.id)) routeIds.push(r.id);
          }
        }
      }

      // Fetch rides from all route IDs
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
            break; // found data, no need to check further
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

      // Match live vehicles to schedule: by HH:MM of scheduled start time
      // Include vehicles from all same-direction alternatives
      const liveByStart = new Map();
      for (const v of vehicles) {
        if (v.siri_ride__scheduled_start_time) {
          const key = v.siri_ride__scheduled_start_time.substring(11, 16);
          // Keep the closest vehicle if multiple match same time
          if (!liveByStart.has(key)) liveByStart.set(key, v);
        }
      }

      const nowMs = Date.now();
      const arr = starts.map(ms => {
        const arrivalMs = ms + info.offsetMs; // actual UTC timestamp of arrival
        const arrUTC = new Date(arrivalMs);
        const il = toIsraelTime(arrUTC);
        const diffMin = Math.round((arrivalMs - nowMs) / 60000); // real minutes from now
        const key = new Date(ms).toISOString().substring(11, 16);
        const live = liveByStart.get(key) || null;
        let liveEtaVal = null, passed = false, stopsAway = null;
        if (live) {
          const result = calcScheduleEta(live, stop);
          if (result?.passed) passed = true;
          else if (result?.eta) { liveEtaVal = result.eta; stopsAway = result.stopsAway; }
        }
        return { ...il, live, liveEta: liveEtaVal, passed, stopsAway, diffMin, arrivalMs };
      }).sort((a, b) => a.arrivalMs - b.arrivalMs); // sort by actual time, not minutes-of-day

      setSchedule(arr);
    } catch (e) { console.error('Schedule:', e); }
  }

  // ═══ GO HOME ═══
  function goHome() {
    setView('home');
    setTracked(null);
    setVehicles([]);
    setStops([]);
    setRouteCoords([]);
    setWalkRoute(null);
    setSelectedStop(null);
    setSchedule(null);
    clearInterval(vehicleTimer.current);
  }

  function goSearch() {
    setView('search');
  }

  // ═══ HELPERS ═══
  function extractCities(name) {
    // "כרמלית-תל אביב יפו<->ת. מרכזית רחובות/רציפים-רחובות-1#"
    const cleaned = name.replace(/-\d+[#0-9א-ת]*$/, '');
    const parts = cleaned.split('<->');
    if (parts.length !== 2) return { from: '', to: '', fromFull: cleaned, toFull: '' };

    // Extract stop name (before last dash) and city (after last dash)
    const parse = s => {
      const m = s.match(/^(.+)-([^-]+)$/);
      if (!m) return { stop: s.trim(), city: '' };
      return { stop: m[1].trim(), city: m[2].trim() };
    };
    const a = parse(parts[0]);
    const b = parse(parts[1]);

    // If same city, show stop names; otherwise show cities
    const sameCity = a.city && b.city && a.city === b.city;
    return {
      from: sameCity ? a.stop : (a.city || a.stop),
      to: sameCity ? b.stop : (b.city || b.stop),
      fromFull: `${a.stop}${a.city ? ', ' + a.city : ''}`,
      toFull: `${b.stop}${b.city ? ', ' + b.city : ''}`,
    };
  }

  // ═══ SCHEDULE-BASED ETA ═══
  // Instead of straight-line distance / speed, use:
  // 1. Find which stop the bus is nearest to (its position along the route)
  // 2. Look up scheduled time from that stop to the target stop
  // 3. That accounts for road distance, intermediate stops, and traffic patterns

  function findNearestStopIndex(lat, lon) {
    let minD = Infinity, idx = -1;
    for (let i = 0; i < stops.length; i++) {
      const d = distanceM(lat, lon, stops[i].gtfs_stop__lat, stops[i].gtfs_stop__lon);
      if (d < minD) { minD = d; idx = i; }
    }
    return { index: idx, distance: minD };
  }

  function calcScheduleEta(vehicle, targetStop) {
    if (!stops.length || !scheduleData?.stopOffsets) return null;

    // Find where the bus is along the route
    const busPos = findNearestStopIndex(vehicle.lat, vehicle.lon);
    if (busPos.index < 0) return null;

    // Find the target stop's index
    const targetIdx = stops.findIndex(s => s.id === targetStop.id);
    if (targetIdx < 0) return null;

    // Bus must be before the target stop (hasn't passed it yet)
    if (busPos.index >= targetIdx) return { passed: true };

    // Get scheduled offsets for both stops
    const busStopId = stops[busPos.index].gtfs_stop_id;
    const targetStopId = targetStop.gtfs_stop_id;
    const busOffset = scheduleData.stopOffsets.get(busStopId);
    const targetOffset = scheduleData.stopOffsets.get(targetStopId);
    if (!busOffset || !targetOffset) return null;

    // Scheduled travel time between the two stops (in minutes)
    const scheduledMinutes = Math.round((targetOffset.offsetMs - busOffset.offsetMs) / 60000);

    // Adjust: how far is the bus from the nearest stop? Add a fraction of the inter-stop time
    // If bus is between stops, it's partway through — but this is a minor correction
    // The main value is the schedule-based time between stops

    if (scheduledMinutes <= 0) return { passed: true };
    if (scheduledMinutes > 90) return null;

    return { eta: scheduledMinutes, stopsAway: targetIdx - busPos.index };
  }

  // Best live ETA for closest stop
  let liveEta = null;
  let liveStopsAway = null;
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

  // Walking time to closest stop (~5 km/h = 83 m/min, add 20% for real-world routing)
  let walkMin = null;
  let walkDist = null;
  if (savedLoc && closestStop) {
    walkDist = distanceM(savedLoc.lat, savedLoc.lon, closestStop.gtfs_stop__lat, closestStop.gtfs_stop__lon);
    walkMin = Math.max(1, Math.round((walkDist * 1.2) / 83));
  }


  // ═══════════ RENDER ═══════════
  return (
    <div className="app">
      {/* ── MAP ── */}
      <MapContainer center={[31.77, 35.21]} zoom={8} zoomControl={false} className="the-map">
        <TileLayer
          key={theme}
          url={theme === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'}
          maxZoom={20} subdomains="abcd"
        />
        <FitBoundsOnChange coords={fitCoords} trigger={fitTrigger} />
        {flyToTrigger > 0 && savedLoc && <FlyToLocation lat={savedLoc.lat} lon={savedLoc.lon} trigger={flyToTrigger} />}
        {pinMode ? (
          <MapClickHandler onPin={(lat, lon) => { setPinMode(false); saveLocation(lat, lon); }} />
        ) : (
          <MapClickHandler onMapTap={() => {
            if (view === 'schedule') { setSelectedStop(null); setView('tracking'); }
            else if (view === 'tracking') { /* stay */ }
          }} />
        )}

        {routeCoords.length > 1 && <Polyline positions={routeCoords} pathOptions={{ color: opColor, weight: 5, opacity: 0.5, lineCap: 'round', lineJoin: 'round' }} />}

        {stops.map(s => (
          <Marker key={s.id} position={[s.gtfs_stop__lat, s.gtfs_stop__lon]}
            icon={selectedStop?.id === s.id ? selectedStopIcon : closestStop?.id === s.id ? closestStopIcon : stopIconSm}
            eventHandlers={{ click: () => openSchedule(s) }} />
        ))}

        {vehicles.map(v => (
          <Marker key={v.siri_ride__vehicle_ref} position={[v.lat, v.lon]} icon={makeBusIcon(v.bearing, opColor, tracked?.lineName)}>
            <Popup closeButton={false} className="bus-popup">
              {(() => {
                const mins = v.recorded_at_time ? Math.max(0, Math.round((Date.now() - new Date(v.recorded_at_time).getTime()) / 60000)) : null;
                const plateRaw = v.siri_ride__vehicle_ref || '';
                // Israeli plates: 8 digits = XXX-XX-XXX, 7 digits = XX-XXX-XX
                const plate = plateRaw.length === 8
                  ? `${plateRaw.slice(0,3)}-${plateRaw.slice(3,5)}-${plateRaw.slice(5)}`
                  : plateRaw.length === 7
                    ? `${plateRaw.slice(0,2)}-${plateRaw.slice(2,5)}-${plateRaw.slice(5)}`
                    : plateRaw;
                return (
                  <div className="bus-popup-inner">
                    <div className="bus-popup-header">
                      <span className="bus-popup-badge" style={{ background: opColor }}>{tracked?.lineName}</span>
                      <div className="bus-plate">
                        <div className="bus-plate-band"></div>
                        <span className="bus-plate-num">{plate}</span>
                      </div>
                    </div>
                    <div className="bus-popup-stats">
                      {v.velocity != null && <span className="bus-popup-stat">{v.velocity} קמ"ש</span>}
                      {v.bearing != null && <span className="bus-popup-stat">{v.bearing}°</span>}
                    </div>
                    {mins != null && (
                      <div className="bus-popup-time">
                        {mins === 0 ? 'עכשיו' : mins === 1 ? 'לפני דקה' : `לפני ${mins} דק'`}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Popup>
          </Marker>
        ))}

        {/* Walking route to nearest stop */}
        {view === 'tracking' && walkRoute && (
          <Polyline
            positions={walkRoute}
            pathOptions={{ color: '#5B8DEF', weight: 3, opacity: 0.7, dashArray: '4,8', lineCap: 'round' }}
          />
        )}
        {view === 'tracking' && !walkRoute && savedLoc && closestStop && (
          <Polyline
            positions={[[savedLoc.lat, savedLoc.lon], [closestStop.gtfs_stop__lat, closestStop.gtfs_stop__lon]]}
            pathOptions={{ color: '#5B8DEF', weight: 3, opacity: 0.4, dashArray: '6,8', lineCap: 'round' }}
          />
        )}

        {savedLoc && (
          <Marker
            position={[savedLoc.lat, savedLoc.lon]}
            icon={meIcon}
            draggable={devMode}
            eventHandlers={devMode ? {
              dragend: (e) => {
                const ll = e.target.getLatLng();
                saveLocation(ll.lat, ll.lng);
              }
            } : {}}
          />
        )}
      </MapContainer>

      {/* ── FLOATING BAR ── */}
      {view !== 'search' && view !== 'schedule' && (
        <div className="float-bar">
          {tracked ? (
            <>
              <button className="float-btn" onClick={goHome}><BackIcon color="var(--text1)" /></button>
              <div className="float-pill">
                <span className="float-badge" style={{ background: opColor }}>{tracked.lineName}</span>
                <span className="float-pill-text" style={{ fontSize: 13 }}>{tracked.from ? fmtDir(tracked.from, tracked.to) : tracked.agencyName}</span>
              </div>
              <button className="float-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <SunIcon color="var(--text2)" /> : <MoonIcon color="var(--text2)" />}
              </button>
            </>
          ) : (
            <>
              <div className="float-pill" onClick={goSearch}>
                <SearchIcon size={16} color="var(--search-icon)" />
                <span className="float-pill-text float-pill-placeholder">חפש קו...</span>
              </div>
              <button className="float-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <SunIcon color="var(--text2)" /> : <MoonIcon color="var(--text2)" />}
              </button>
            </>
          )}
        </div>
      )}


      {/* ── LOCATION FAB ── */}
      <button className="location-fab" onClick={() => {
        // If we have a location, just fly to it
        if (savedLoc) {
          setFlyToTrigger(t => t + 1);
          // Silently update GPS in background (not in dev mode)
          if (!devMode) navigator.geolocation?.getCurrentPosition(
            pos => saveLocation(pos.coords.latitude, pos.coords.longitude),
            () => {}, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
          );
          return;
        }
        // No saved location — try GPS, fallback to pin mode
        setLocError(null);
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => {
              setLocError(null);
              saveLocation(pos.coords.latitude, pos.coords.longitude);
              setFlyToTrigger(t => t + 1);
            },
            (err) => {
              const msgs = {
                1: 'הגישה למיקום נדחתה. יש לאשר בהגדרות הדפדפן',
                2: 'לא ניתן לזהות מיקום',
                3: 'זמן המתנה למיקום עבר',
              };
              setLocError(msgs[err.code] || `שגיאה: ${err.message}`);
              if (devMode) setPinMode(true);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
          );
        } else {
          setLocError('הדפדפן לא תומך במיקום');
          if (devMode) setPinMode(true);
        }
      }}>
        <LocationIcon size={20} color="var(--text1)" />
      </button>

      {/* ── PIN BANNER ── */}
      {pinMode && (
        <div className="pin-banner">
          <div>
            <div>בחר מיקום על המפה</div>
            {locError && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{locError}</div>}
          </div>
          <button onClick={() => { setPinMode(false); setLocError(null); }}>ביטול</button>
        </div>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>{loadingMsg}</div>
        </div>
      )}

      {/* ── SEARCH OVERLAY ── */}
      {view === 'search' && (
        <SearchOverlay
          suggestions={suggestions}
          recentLines={recentLines}
          onTrackLine={startTracking}
          onClose={goHome}
        />
      )}

      {/* ── BOTTOM SHEET ── */}
      {view !== 'search' && (
      <div className={`bottom-sheet ${view === 'schedule' ? 'full' : tracked ? 'peek' : 'half'}`}>
        <div className="sheet-handle-area" onDoubleClick={() => {
          if (window.confirm('Clear all data? (dev)')) {
            localStorage.clear();
            window.location.reload();
          }
        }}><div className="sheet-handle" /></div>
        <div className="sheet-content">

          {view === 'home' && (
            <HomeSheet
              suggestions={suggestions}
              suggestionsLive={suggestionsLive}
              nearbyBuses={nearbyBuses}
              recentLines={recentLines}
              fmtDir={fmtDir}
              onTrackLine={startTracking}
              onSearch={goSearch}
            />
          )}

          {view === 'tracking' && (
            <TrackingSheet
              tracked={tracked}
              closestStop={closestStop}
              vehicles={vehicles}
              liveEta={liveEta}
              liveStopsAway={liveStopsAway}
              walkMin={walkMin}
              walkDist={walkDist}
              showDirPicker={showDirPicker}
              fmtDir={fmtDir}
              onToggleDirPicker={() => tracked?.siblings?.length > 1 && setShowDirPicker(!showDirPicker)}
              onSwapDirection={() => {
                const current = tracked?.siblings?.find(s => s.lineRef === tracked.lineRefs[0]);
                if (!current) return;
                let mirror = tracked.siblings.find(s => s.lineRef !== current.lineRef && s.alternative === current.alternative && s.direction !== current.direction);
                if (!mirror) mirror = tracked.siblings.find(s => s.lineRef !== current.lineRef && s.alternative === current.alternative);
                if (!mirror) mirror = tracked.siblings.find(s => s.lineRef !== current.lineRef);
                if (mirror) startTracking(tracked.lineName, [mirror.lineRef], tracked.agencyName, mirror.from, mirror.to, tracked.siblings);
              }}
              onPickDirection={(s) => { setShowDirPicker(false); if (s.lineRef !== tracked?.lineRefs?.[0]) startTracking(tracked.lineName, [s.lineRef], tracked.agencyName, s.from, s.to, tracked.siblings); }}
              onOpenSchedule={openSchedule}
            />
          )}

          {view === 'schedule' && selectedStop && (
            <ScheduleSheet
              selectedStop={selectedStop}
              tracked={tracked}
              schedule={schedule}
              opColor={opColor}
              walkMin={walkMin}
              onClose={() => { setSelectedStop(null); setView('tracking'); }}
            />
          )}

        </div>
      </div>
      )}
    </div>
  );
}
