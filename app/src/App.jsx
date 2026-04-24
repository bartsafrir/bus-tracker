import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useQueryClient } from '@tanstack/react-query';
import { useRouteStops, useTodayRouteId, useSiblings } from './hooks/useTransitData';
import { getOperatorColor } from './utils/operators';
import { toIsraelTime, israelNow, formatCountdown } from './utils/time';
import { distanceM } from './utils/geo';
import { SearchIcon, LocationIcon, SunIcon, MoonIcon, BackIcon, CloseIcon, WalkIcon, SwapIcon } from './components/Icons';
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

// GTFS service day: use Israel date. After midnight Israel, late-night buses
// are still part of the previous day's schedule until ~4am.
function today() {
  const now = new Date();
  const ilHour = parseInt(now.toLocaleString('en', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hour12: false }));
  // Before 4am Israel = still the previous service day
  if (ilHour < 4) {
    const yesterday = new Date(now.getTime() - 86400000);
    return yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }); // YYYY-MM-DD
  }
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

// OSRM routing — returns [[lat,lon],...] or null
// Decode Valhalla encoded polyline (precision 6)
function decodePolyline(str) {
  const coords = []; let lat = 0, lon = 0, i = 0;
  while (i < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lon += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat / 1e6, lon / 1e6]);
  }
  return coords;
}

// Routing via Valhalla (real pedestrian + bus profiles)
async function getRoute(coords, profile = 'auto') {
  if (coords.length < 2) return null;
  const costing = profile === 'foot' ? 'pedestrian' : profile === 'bus' ? 'bus' : 'auto';
  const CHUNK = 45; // Valhalla limit ~50, use 45 for safety

  // Split into overlapping chunks if needed
  const chunks = [];
  for (let i = 0; i < coords.length; i += CHUNK - 1) {
    chunks.push(coords.slice(i, i + CHUNK));
    if (i + CHUNK >= coords.length) break;
  }

  const allCoords = [];
  for (const chunk of chunks) {
    const locations = chunk.map(c => ({ lat: c[0], lon: c[1] }));
    const body = JSON.stringify({ locations, costing, directions_options: { units: 'km' } });
    try {
      const res = await fetch(`https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(body)}`);
      const data = await res.json();
      if (!data.trip?.legs?.length) continue;
      for (const leg of data.trip.legs) {
        if (leg.shape) {
          const pts = decodePolyline(leg.shape);
          allCoords.push(...(allCoords.length ? pts.slice(1) : pts));
        }
      }
    } catch { /* continue with next chunk */ }
  }
  return allCoords.length > 1 ? allCoords : null;
}

// ─── Leaflet icons ───
const meIcon = L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });
const stopIconSm = L.divIcon({ className: '', html: '<div class="stop-dot"></div>', iconSize: [10, 10], iconAnchor: [5, 5] });
const closestStopIcon = L.divIcon({ className: '', html: '<div class="stop-dot closest"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

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

// ─── Map helpers ───
function FitBoundsOnChange({ coords, trigger }) {
  const map = useMap();
  const lastTrigger = useRef(null);
  useEffect(() => {
    if (!coords.length || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    const b = L.latLngBounds(coords);
    if (b.isValid()) map.fitBounds(b, { padding: [50, 50], maxZoom: 15 });
  }, [coords, trigger, map]);
  return null;
}

function FlyToLocation({ lat, lon, trigger }) {
  const map = useMap();
  const lastTrigger = useRef(null);
  useEffect(() => {
    if (!lat || !lon || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    map.flyTo([lat, lon], 16, { duration: 0.8 });
  }, [lat, lon, trigger, map]);
  return null;
}

function MapClickHandler({ onPin, onMapTap }) {
  useMapEvents({
    click(e) {
      if (onPin) onPin(e.latlng.lat, e.latlng.lng);
      else if (onMapTap) onMapTap();
    },
  });
  return null;
}

// ─── Keep latest per vehicle ───
function latestPerVehicle(locs) {
  const m = new Map();
  for (const l of locs) {
    const v = l.siri_ride__vehicle_ref;
    if (!v) continue;
    const prev = m.get(v);
    if (!prev || new Date(l.recorded_at_time) > new Date(prev.recorded_at_time)) m.set(v, l);
  }
  return [...m.values()];
}

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
      const rr = await Promise.allSettled(chunks.map(c => api('/gtfs_routes/list', { line_refs: c.join(','), date: today(), limit: 200, order_by: 'date desc' })));
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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStep, setSearchStep] = useState('input'); // input | operators | directions
  const [searchOperators, setSearchOperators] = useState(null);
  const [searchDirections, setSearchDirections] = useState(null);
  const [searchLineName, setSearchLineName] = useState('');

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
  const searchInputRef = useRef(null);

  // ─── React Query: cached route data ───
  const trackingLineRef = tracked?.lineRefs?.[0] || null;
  const todayDate = useMemo(() => today(), []);
  const { data: todayRouteId } = useTodayRouteId(trackingLineRef, todayDate);
  const { data: routeStopsData } = useRouteStops(todayRouteId);
  const { data: siblingsData } = useSiblings(tracked?.lineName, tracked?.agencyName, todayDate);

  // Sync React Query data → local state (for backward compat with existing rendering)
  useEffect(() => {
    if (!routeStopsData) return;
    setStops(routeStopsData.stops);
    setRouteCoords(routeStopsData.stops.map(s => [s.gtfs_stop__lat, s.gtfs_stop__lon]));
    setScheduleData({ stopOffsets: routeStopsData.offsets, todayGtfsRouteId: todayRouteId, referenceRideStart: routeStopsData.refStart });
    setFitTrigger(t => t + 1);
    // Get actual driving route
    getRoute(routeStopsData.stops.map(s => [s.gtfs_stop__lat, s.gtfs_stop__lon]), 'bus').then(path => { if (path) setRouteCoords(path); });
  }, [routeStopsData, todayRouteId]);

  // Sync siblings
  useEffect(() => {
    if (!siblingsData?.length || !tracked) return;
    const sibs = siblingsData.map(r => {
      const c = extractCities(r.routeLongName);
      return { lineRef: r.lineRef, from: c.from, to: c.to, direction: r.direction, alternative: r.alternative };
    });
    if (sibs.length > 1) setTracked(prev => prev ? { ...prev, siblings: sibs } : prev);
  }, [siblingsData]);

  // ─── Derived ───
  const fitCoords = useMemo(() => {
    const c = [...routeCoords];
    vehicles.forEach(v => c.push([v.lat, v.lon]));
    if (savedLoc) c.push([savedLoc.lat, savedLoc.lon]);
    return c;
  }, [routeCoords, vehicles, savedLoc]);

  // ═══ SEARCH ═══
  // Auto-search with debounce
  const searchTimer = useRef(null);
  useEffect(() => {
    if (view !== 'search' || !searchQuery.trim() || searchQuery.trim().length < 1) return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(searchQuery), 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery, view]);

  async function doSearch(term) {
    const t = (term || searchQuery).trim();
    if (!t) return;
    setSearchLineName(t);
    setLoading(true);
    setLoadingMsg('מחפש...');
    setSearchStep('input');

    try {
      const routes = await apiFetch('/gtfs_routes/list', { route_short_name: t, date: today(), limit: 200, order_by: 'date desc' });
      const todayDate = today();
      const seen = new Set();
      let unique = routes.filter(r => { if (r.date === todayDate && !seen.has(r.line_ref)) { seen.add(r.line_ref); return true; } return false; });
      if (!unique.length) { seen.clear(); unique = routes.filter(r => { if (!seen.has(r.line_ref)) { seen.add(r.line_ref); return true; } return false; }); }

      if (!unique.length) { setSearchOperators(new Map()); setSearchStep('operators'); setLoading(false); return; }

      // Enrich with hours
      const enriched = await Promise.all(unique.map(async r => {
        try {
          const [first, last] = await Promise.all([
            api('/gtfs_rides/list', { gtfs_route_id: r.id, limit: 1, order_by: 'start_time asc' }),
            api('/gtfs_rides/list', { gtfs_route_id: r.id, limit: 1, order_by: 'start_time desc' }),
          ]);
          const allR = await apiFetch('/gtfs_rides/list', { gtfs_route_id: r.id, limit: 200 });
          return {
            ...r,
            firstTime: first[0]?.start_time ? toIsraelTime(new Date(first[0].start_time)) : null,
            lastTime: last[0]?.start_time ? toIsraelTime(new Date(last[0].start_time)) : null,
            rideCount: allR.filter(rd => rd.start_time).length,
          };
        } catch { return { ...r, firstTime: null, lastTime: null, rideCount: 0 }; }
      }));

      // Group by operator
      const byOp = new Map();
      for (const r of enriched) {
        if (!byOp.has(r.agency_name)) byOp.set(r.agency_name, []);
        byOp.get(r.agency_name).push(r);
      }

      if (byOp.size === 1) {
        const [opName, opRoutes] = [...byOp.entries()][0];
        if (opRoutes.length === 1) {
          const c = extractCities(opRoutes[0].route_long_name);
          startTracking(t, [opRoutes[0].line_ref], opName, c.from, c.to);
        } else {
          setSearchDirections({ opName, routes: opRoutes });
          setSearchStep('directions');
        }
      } else {
        setSearchOperators(byOp);
        setSearchStep('operators');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // ═══ TRACK LINE ═══
  // Route stops, path, and siblings are now handled by React Query hooks above.
  // startTracking just sets the state that triggers those hooks.
  async function startTracking(lineName, lineRefs, agencyName, dirFrom, dirTo, siblings) {
    setView('tracking');
    setShowDirPicker(false);
    const color = getOperatorColor(agencyName);
    setOpColor(color.bg);
    setTracked({ lineName, lineRefs, agencyName, from: dirFrom || '', to: dirTo || '', siblings: siblings || null });
    logUsage({ lineName, lineRef: lineRefs[0], agencyName, from: dirFrom || '', to: dirTo || '' });
    setVehicles([]);
    setSelectedStop(null);
    setSchedule(null);
    setWalkRoute(null);
    clearInterval(vehicleTimer.current);

    // Only manual work: fetch vehicles (live, not cached)
    try {
      await refreshVehicles(lineRefs);
      vehicleTimer.current = setInterval(() => refreshVehicles(lineRefs), 30000);
    } catch (e) { console.error('Track:', e); }
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
    getRoute([[savedLoc.lat, savedLoc.lon], [closestStop.gtfs_stop__lat, closestStop.gtfs_stop__lon]], 'foot')
      .then(path => setWalkRoute(path));
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
        api('/siri_vehicle_locations/list', {
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
        routeIds.map(rid => api('/gtfs_rides/list', { gtfs_route_id: rid, limit: 200, order_by: 'start_time asc' }))
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
              futureIds.map(rid => api('/gtfs_rides/list', { gtfs_route_id: rid, limit: 200, order_by: 'start_time asc' }))
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
    setSearchStep('input');
    setSearchOperators(null);
    setSearchDirections(null);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }

  // ═══ HELPERS ═══
  function getStatus(r) {
    const now = israelNow().totalMinutes;
    if (!r.firstTime || !r.lastTime || !r.rideCount) return { label: 'לא פעיל היום', cls: 'inactive' };
    if (r.rideCount <= 3) return { label: `${r.rideCount} נסיעות בלבד`, cls: now >= r.firstTime.minutes && now <= r.lastTime.minutes + 60 ? 'sparse' : 'inactive' };
    return now >= r.firstTime.minutes - 10 && now <= r.lastTime.minutes + 60 ? { label: 'פעיל עכשיו', cls: 'active' } : { label: 'לא פעיל כרגע', cls: 'inactive' };
  }

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

  const nowMin = israelNow().totalMinutes;

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

        {routeCoords.length > 1 && <Polyline positions={routeCoords} pathOptions={{ color: opColor, weight: 4, opacity: 0.6, lineCap: 'round', lineJoin: 'round' }} />}

        {stops.map(s => (
          <Marker key={s.id} position={[s.gtfs_stop__lat, s.gtfs_stop__lon]}
            icon={selectedStop?.id === s.id || closestStop?.id === s.id ? closestStopIcon : stopIconSm}
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

      {/* ── SEARCH OVERLAY (full screen, above everything) ── */}
      {view === 'search' && (
        <div className="search-overlay">
          <div className="search-bar">
            <button className="search-close" onClick={goHome}><CloseIcon size={16} /></button>
            <input ref={searchInputRef} className="search-field" placeholder="הקלד מספר קו..." inputMode="numeric"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()} autoFocus />
            {searchQuery && (
              <button className="search-clear" onClick={() => { setSearchQuery(''); setSearchStep('input'); setSearchOperators(null); setSearchDirections(null); searchInputRef.current?.focus(); }}>
                <CloseIcon size={14} />
              </button>
            )}
          </div>

          {!loading && searchStep === 'input' && !searchQuery.trim() && (suggestions.length > 0 || recentLines.length > 0) && (
            <>
              {suggestions.length > 0 && (
                <>
                  <div className="section-hdr">מוצע עבורך</div>
                  {suggestions.slice(0, 4).map(s => {
                    const color = getOperatorColor(s.agencyName);
                    return (
                      <div key={s.lineRef} className="picker-item" onClick={() => startTracking(s.lineName, [s.lineRef], s.agencyName, s.from, s.to)}>
                        <div className="badge-line" style={{ background: color.bg }}>{s.lineName}</div>
                        <div className="picker-info">
                          <div className="picker-title">{s.from ? fmtDir(s.from, s.to) : s.agencyName}</div>
                          <div className="picker-sub">{s.agencyName}</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {recentLines.length > 0 && (
                <>
                  <div className="section-hdr">אחרונים</div>
                  {recentLines.slice(0, 4).map(r => {
                    const color = getOperatorColor(r.agencyName);
                    return (
                      <div key={r.lineRef} className="picker-item" onClick={() => startTracking(r.lineName, [r.lineRef], r.agencyName, r.from, r.to)}>
                        <div className="badge-line" style={{ background: color.bg }}>{r.lineName}</div>
                        <div className="picker-info">
                          <div className="picker-title">{r.from ? fmtDir(r.from, r.to) : r.agencyName}</div>
                          <div className="picker-sub">{r.agencyName}</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}

          {!loading && searchStep === 'operators' && searchOperators && (
            <>
              <div className="section-hdr">תוצאות לקו {searchLineName}</div>
              {searchOperators.size === 0 && <div className="empty-msg">לא נמצא קו {searchLineName}</div>}
              {[...searchOperators.entries()]
                .sort((a, b) => { const aA = a[1].some(r => getStatus(r).cls === 'active'); const bA = b[1].some(r => getStatus(r).cls === 'active'); return aA === bA ? 0 : aA ? -1 : 1; })
                .map(([opName, routes]) => {
                  const cities = extractCities(routes[0].route_long_name);
                  const best = routes.find(r => getStatus(r).cls === 'active') || routes[0];
                  const st = getStatus(best);
                  const color = getOperatorColor(opName);
                  const hrs = best.firstTime && best.lastTime ? `${best.firstTime.str}-${best.lastTime.str}` : '';
                  return (
                    <div key={opName} className="picker-item" onClick={() => {
                      if (routes.length === 1) { const c = extractCities(routes[0].route_long_name); startTracking(searchLineName, [routes[0].line_ref], opName, c.from, c.to); }
                      else { setSearchDirections({ opName, routes }); setSearchStep('directions'); }
                    }}>
                      <div className="badge-line" style={{ background: color.bg, fontSize: 17, padding: '6px 16px' }}>{searchLineName}</div>
                      <div className="picker-info">
                        <div className="picker-title">{opName}</div>
                        <div className="picker-sub">{cities.from} ↔ {cities.to}{hrs && <> · <span className="picker-hours">{hrs}</span></>}</div>
                        <span className={`status-badge ${st.cls}`}>{st.label}</span>
                      </div>
                      <span style={{ color: 'var(--text3)', fontSize: 16, fontWeight: 600 }}>‹</span>
                    </div>
                  );
                })}
            </>
          )}

          {!loading && searchStep === 'directions' && searchDirections && (
            <>
              <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
                <button className="search-close" onClick={() => setSearchStep('operators')}><BackIcon size={16} /></button>
                <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>קו {searchLineName} · {searchDirections.opName}</span>
              </div>
              {[...searchDirections.routes]
                .sort((a, b) => {
                  const order = { active: 0, sparse: 1, inactive: 2 };
                  return (order[getStatus(a).cls] ?? 2) - (order[getStatus(b).cls] ?? 2);
                })
                .map(route => {
                const cities = extractCities(route.route_long_name);
                const st = getStatus(route);
                const alt = route.route_alternative && route.route_alternative !== '#' && route.route_alternative !== '0' ? ` · חלופה ${route.route_alternative}` : '';
                const hrs = route.firstTime && route.lastTime ? `${route.firstTime.str}-${route.lastTime.str}` : '';
                return (
                  <div key={route.line_ref} className="picker-item" style={{ opacity: st.cls === 'inactive' ? 0.35 : 1 }}
                    onClick={() => {
                      const c = extractCities(route.route_long_name);
                      const allSibs = searchDirections.routes.map(r => {
                        const sc = extractCities(r.route_long_name);
                        return { lineRef: r.line_ref, from: sc.from, to: sc.to, direction: r.route_direction, alternative: r.route_alternative };
                      });
                      startTracking(searchLineName, [route.line_ref], searchDirections.opName, c.from, c.to, allSibs.length > 1 ? allSibs : null);
                    }}>
                    <div className="picker-icon" style={{ background: st.cls === 'inactive' ? 'var(--bg-subtle)' : 'rgba(48,209,88,0.08)', fontSize: 22 }}>←</div>
                    <div className="picker-info">
                      <div className="picker-title">{cities.from} ← {cities.to}</div>
                      <div className="picker-sub">כיוון {route.route_direction}{alt}{hrs && <> · <span className="picker-hours">{hrs}</span></>}{route.rideCount > 0 && <> · {route.rideCount} נסיעות</>}</div>
                      <span className={`status-badge ${st.cls}`}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
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

          {/* HOME */}
          {view === 'home' && (
            <div>
              {/* Smart suggestions */}
              {suggestions.length > 0 && (
                <>
                  <div className="section-hdr">✦ מוצע עבורך</div>
                  {suggestions.map(s => {
                    const c = getOperatorColor(s.agencyName);
                    const live = suggestionsLive[s.lineRef];
                    return (
                      <div key={s.lineRef} className="row" onClick={() => startTracking(s.lineName, [s.lineRef], s.agencyName, s.from, s.to)}>
                        <div className="badge-line" style={{ background: c.bg }}>{s.lineName}</div>
                        <div className="row-info">
                          <div className="row-name">{s.from ? fmtDir(s.from, s.to) : s.agencyName}</div>
                          <div className="row-detail">
                            {s.agencyName}
                            {live?.stopName && ` · ${live.stopName}`}
                          </div>
                        </div>
                        {live?.liveCount > 0 && (
                          <div className="row-right">
                            {live.eta != null ? (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}><span className="live-badge">LIVE</span></div>
                                <div className="row-eta">{live.eta}</div>
                                <div className="row-unit">דק'</div>
                              </>
                            ) : (
                              <span className="live-badge">LIVE</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Nearby live */}
              {nearbyBuses.length > 0 && (
                <>
                  <div className="section-hdr">קווים חיים סביבך</div>
                  {nearbyBuses.map(b => {
                    const c = getOperatorColor(b.agency);
                    const distText = b.dist < 1000 ? `${Math.round(b.dist)} מ'` : `${(b.dist/1000).toFixed(1)} ק"מ`;
                    return (
                      <div key={b.siri_ride__vehicle_ref} className="row"
                        onClick={() => startTracking(b.name, [b.siri_route__line_ref], b.agency, b.from, b.to)}>
                        <div className="badge-line" style={{ background: c.bg }}>{b.name}</div>
                        <div className="row-info">
                          <div className="row-name">{b.from ? fmtDir(b.from, b.to) : b.name}</div>
                          <div className="row-detail">{b.agency} · {distText}</div>
                        </div>
                        {b.etaMin != null && (
                          <div className="row-right">
                            <div className="row-eta">{b.etaMin}</div>
                            <div className="row-unit">דק'</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Empty state */}
              {!suggestions.length && !recentLines.length && !nearbyBuses.length && (
                <div className="row" onClick={goSearch} style={{ justifyContent: 'center', color: 'var(--text2)', fontWeight: 500 }}>
                  <SearchIcon size={16} color="var(--text2)" />
                  <span style={{ marginRight: 6 }}>חפש קו כדי להתחיל</span>
                </div>
              )}

              {/* Recent lines */}
              {recentLines.length > 0 && (
                <>
                  <div className="section-hdr">{suggestions.length ? 'אחרונים' : 'קווים אחרונים'}</div>
                  <div className="chip-row">
                    {recentLines.slice(0, 6).map(r => {
                      const c = getOperatorColor(r.agencyName);
                      return (
                        <button key={r.lineRef} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          onClick={() => startTracking(r.lineName, [r.lineRef], r.agencyName, r.from, r.to)}>
                          <span style={{ background: c.bg, color: 'white', padding: '1px 6px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{r.lineName}</span>
                          <span style={{ fontSize: 12 }}>{r.from || r.agencyName}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TRACKING */}
          {view === 'tracking' && (
            <div>
              {/* Direction bar — tap swap to switch, long-press for full picker */}
              {tracked?.cities && (
                <div className="dir-bar">
                  <div className="dir-bar-text" onClick={() => tracked?.siblings?.length > 1 && setShowDirPicker(!showDirPicker)}>
                    {fmtDir(tracked.from, tracked.to)}
                    {tracked?.siblings?.length > 1 && <span className="dir-bar-more"> ▾</span>}
                  </div>
                  {tracked?.siblings?.length > 1 && (
                    <button className="dir-swap-btn" onClick={() => {
                      const current = tracked.siblings.find(s => s.lineRef === tracked.lineRefs[0]);
                      if (!current) return;
                      // Find mirror: same alternative, different direction
                      let mirror = tracked.siblings.find(s =>
                        s.lineRef !== current.lineRef && s.alternative === current.alternative && s.direction !== current.direction
                      );
                      // Fallback: any sibling with same alternative
                      if (!mirror) mirror = tracked.siblings.find(s =>
                        s.lineRef !== current.lineRef && s.alternative === current.alternative
                      );
                      // Fallback: any other sibling that's not the current one
                      if (!mirror) mirror = tracked.siblings.find(s => s.lineRef !== current.lineRef);
                      if (mirror) {
                        startTracking(tracked.lineName, [mirror.lineRef], tracked.agencyName, mirror.from, mirror.to, tracked.siblings);
                      }
                    }}>
                      <SwapIcon size={16} color="var(--text1)" />
                    </button>
                  )}
                </div>
              )}
              {/* Full direction picker */}
              {showDirPicker && tracked?.siblings && (
                <div className="dir-picker">
                  {tracked.siblings.map(s => (
                    <div key={s.lineRef}
                      className={`dir-picker-item ${s.lineRef === tracked.lineRefs[0] ? 'active' : ''}`}
                      onClick={() => {
                        setShowDirPicker(false);
                        if (s.lineRef !== tracked.lineRefs[0]) {
                          startTracking(tracked.lineName, [s.lineRef], tracked.agencyName, s.from, s.to, tracked.siblings);
                        }
                      }}>
                      <span className="dir-picker-label">{fmtDir(s.from, s.to)}</span>
                      {s.lineRef === tracked.lineRefs[0] && <span className="dir-picker-check">✓</span>}
                    </div>
                  ))}
                </div>
              )}
              {closestStop && (
                <div className="stop-card">
                  <div>
                    <div className="stop-name">{closestStop.gtfs_stop__name || 'תחנה'}{closestStop.gtfs_stop__city ? `, ${closestStop.gtfs_stop__city}` : ''}</div>
                    <div className="stop-sub">{closestStop.gtfs_stop__code ? `תחנה ${closestStop.gtfs_stop__code} · ` : ''}<WalkIcon size={13} color="var(--walk-text)" /> {walkMin != null ? `${walkMin} דק' הליכה` : 'התחנה הקרובה'}{walkDist != null ? ` · ${walkDist < 1000 ? Math.round(walkDist) + ' מ\'' : (walkDist/1000).toFixed(1) + ' ק"מ'}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {liveEta != null ? (
                      <div className="eta-block">
                        <div style={{ marginBottom: 4 }}><span className="live-badge">LIVE</span></div>
                        <div className="eta-num">~{liveEta}</div>
                        <div className="eta-label">דקות{liveStopsAway ? ` · ${liveStopsAway} תחנות` : ''}</div>
                      </div>
                    ) : vehicles.length > 0 ? (
                      <div className="eta-block">
                        <span className="live-badge">LIVE</span>
                        <div className="eta-label" style={{ marginTop: 4 }}>{vehicles.length} במעקב</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
              {closestStop && (
                <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => openSchedule(closestStop)}>
                  <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>צפה בלוח זמנים מלא →</span>
                </div>
              )}
              {!closestStop && !vehicles.length && (
                <div className="empty-msg">אין מעקב חי כרגע</div>
              )}
            </div>
          )}

          {/* SCHEDULE — minutes-first */}
          {view === 'schedule' && selectedStop && (
            <div>
              {/* Header */}
              <div className="sched-head">
                <div>
                  <div className="sched-title">
                    <span className="sched-line-badge" style={{ background: opColor }}>{tracked?.lineName}</span>
                    {selectedStop.gtfs_stop__name || 'תחנה'}
                  </div>
                  <div className="sched-sub">{selectedStop.gtfs_stop__code ? `תחנה ${selectedStop.gtfs_stop__code} · ` : ''}{selectedStop.gtfs_stop__city ? `${selectedStop.gtfs_stop__city} · ` : ''}{tracked?.agencyName}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className="sched-close" onClick={() => { setSelectedStop(null); setView('tracking'); }}><CloseIcon size={16} /></button>
                </div>
              </div>

              {!schedule && <div className="loading"><div className="spinner" /><span>טוען לוח זמנים...</span></div>}

              {schedule && (() => {
                // Split into past, live, future
                const past = [];
                const upcoming = [];
                let foundNext = false;

                // Detect if arrival is "tomorrow" in Israel time
                const todayIL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

                for (const a of schedule) {
                  // Use real timestamp diff, not minutes-of-day (handles midnight correctly)
                  const isPast = a.passed || (!a.live && a.diffMin < -2);
                  if (isPast) { past.push(a); continue; }
                  const mins = a.live && a.liveEta != null ? a.liveEta : Math.max(0, a.diffMin);
                  const arrDateIL = new Date(a.arrivalMs).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
                  const isTomorrow = arrDateIL > todayIL;
                  const isLive = !!a.live;
                  const cantCatch = walkMin != null && mins < walkMin;
                  const tooClose = cantCatch;
                  const isNext = !tooClose && !foundNext;
                  if (isNext) foundNext = true;

                  upcoming.push({ ...a, mins, isNext, isLive, tooClose, isTomorrow });
                }

                return (
                  <>
                    {/* Past collapsed */}
                    {past.length > 0 && (
                      <div className="sc-past-bar">
                        <span>{past.length} נסיעות עברו</span>
                        <div className="sc-past-line" />
                      </div>
                    )}

                    {/* No more rides — show when next ride is */}
                    {upcoming.length === 0 && past.length > 0 && (() => {
                      // Find the first future ride from the full schedule (including next day)
                      const nextRide = schedule.find(a => a.diffMin > 0);
                      const todayIL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
                      let nextLabel = '';
                      if (nextRide) {
                        const rideDate = new Date(nextRide.arrivalMs).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
                        const dayNames = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
                        const rideDay = new Date(nextRide.arrivalMs).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long' });
                        if (rideDate === todayIL) nextLabel = `הנסיעה הבאה היום ב-${nextRide.str}`;
                        else {
                          const tomorrow = new Date(new Date(todayIL).getTime() + 86400000).toLocaleDateString('en-CA');
                          nextLabel = rideDate === tomorrow ? `מחר ב-${nextRide.str}` : `יום ${rideDay} ב-${nextRide.str}`;
                        }
                      }
                      return (
                        <div style={{ padding: '20px 24px', textAlign: 'center' }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text1)', marginBottom: 6 }}>אין נסיעות פעילות כרגע</div>
                          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                            {nextLabel || 'לוח הזמנים עדיין לא פורסם — בדוק שוב מאוחר יותר'}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Upcoming */}
                    {upcoming.map((a, i) => {
                      // The next LIVE bus = highlighted card
                      if (a.isNext && a.isLive) {
                        return (
                          <div key={i} className="sc-hero">
                            <div className="sc-hero-inner">
                              <div className="sc-mins-col">
                                <div className="sc-mins-big hero">{a.mins}</div>
                                <div className="sc-mins-label hero">דק'</div>
                              </div>
                              <div className="sc-hero-info">
                                <span className="live-badge">LIVE</span>
                                {a.stopsAway && <span className="sc-stops">{a.stopsAway} תחנות</span>}
                              </div>
                              <div className="sc-clock-col">
                                <div className="sc-clock-sched">{a.str}{a.isTomorrow && <span className="sc-tomorrow">מחר</span>}</div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Other LIVE rows
                      if (a.isLive) {
                        return (
                          <div key={i} className={`sc-row ${a.tooClose ? 'faded' : ''}`}>
                            <div className="sc-mins-col">
                              <div className="sc-mins-big live">{a.mins}</div>
                              <div className="sc-mins-label live">דק'</div>
                            </div>
                            <div className="sc-row-mid">
                              <span className="live-badge">LIVE</span>
                              {a.stopsAway && <span className="sc-stops">{a.stopsAway} תחנות</span>}
                              {a.tooClose && <span className="sc-miss">לא תספיק</span>}
                            </div>
                            <div className="sc-clock-col">
                              <div className="sc-clock-sched">{a.str}{a.isTomorrow && <span className="sc-tomorrow">מחר</span>}</div>
                            </div>
                          </div>
                        );
                      }

                      // Scheduled rows
                      const far = a.mins > 60;
                      return (
                        <div key={i} className={`sc-row ${far ? 'faded' : ''} ${a.tooClose ? 'faded' : ''}`}>
                          <div className="sc-mins-col">
                            <div className={`sc-mins-big ${a.isNext ? 'next' : ''}`}>{a.mins}</div>
                            <div className="sc-mins-label">דק'</div>
                          </div>
                          <div className="sc-row-mid">
                            {a.tooClose && <span className="sc-miss">לא תספיק</span>}
                          </div>
                          <div className="sc-clock-col">
                            <span className="sc-clock-time">{a.str}{a.isTomorrow && <span className="sc-tomorrow">מחר</span>}</span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          )}

        </div>
      </div>
      )}
    </div>
  );
}
