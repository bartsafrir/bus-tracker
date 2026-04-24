import { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { getVehicleLocations, getNearbyVehicles, apiFetch, todayStr } from '../api/stride';
import { latestPerVehicle } from '../utils/routes';
import { toIsraelTime, israelNow, formatCountdown } from '../utils/time';
import { distanceM, isMovingToward } from '../utils/geo';
import { useUserLocation } from '../hooks/useUserLocation';

export default function Home() {
  const { favorites, userLocation, setUserLocation, trackLine, recentSearches } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useUserLocation(userLocation, setUserLocation);
  const [favData, setFavData] = useState({}); // favId → { nextTimes, liveEta, ... }
  const [nearby, setNearby] = useState(null);
  const [locateMode, setLocateMode] = useState(null); // null | 'choosing' | 'gps'

  // Load favorite live data
  useEffect(() => {
    if (!favorites.length) return;
    let cancelled = false;

    async function loadFavs() {
      const data = {};
      await Promise.allSettled(favorites.map(async fav => {
        try {
          const vehicles = latestPerVehicle(
            (await getVehicleLocations(fav.lineRef).catch(() => []))
          );

          // Get schedule info
          const todayRoutes = await apiFetch('/gtfs_routes/list', {
            line_refs: fav.lineRef, date: todayStr(), limit: 1, order_by: 'date desc',
          });
          const routeId = todayRoutes[0]?.id;
          let nextTimes = [];
          if (routeId) {
            const rides = await apiFetch('/gtfs_rides/list', { gtfs_route_id: routeId, limit: 200, order_by: 'start_time asc' });
            // Simple: just get ride start times as Israel times
            const now = israelNow().totalMinutes;
            nextTimes = rides
              .filter(r => r.start_time)
              .map(r => toIsraelTime(new Date(r.start_time)))
              .filter(t => t.minutes >= now)
              .slice(0, 3);
          }

          // Find closest live bus
          let liveEta = null;
          if (vehicles.length > 0 && fav.stopId) {
            // Get stop position (from the stop data in favorites — approximate using known stop)
            // For now just show vehicle count
            liveEta = `${vehicles.length} אוטובוסים במעקב`;
          }

          data[fav.id] = { vehicles: vehicles.length, nextTimes, liveEta };
        } catch (e) {
          data[fav.id] = { vehicles: 0, nextTimes: [], liveEta: null };
        }
      }));

      if (!cancelled) setFavData(data);
    }

    loadFavs();
    const interval = setInterval(loadFavs, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [favorites]);

  // Load nearby buses
  const loadNearby = useCallback(async (pos) => {
    try {
      const locs = await getNearbyVehicles(pos.lat, pos.lon);
      const latest = latestPerVehicle(locs);

      // Group by line_ref, keep closest
      const byLine = new Map();
      for (const v of latest) {
        const lr = v.siri_route__line_ref;
        const dist = distanceM(pos.lat, pos.lon, v.lat, v.lon);
        const toward = isMovingToward(v.lat, v.lon, v.bearing, pos.lat, pos.lon);
        const existing = byLine.get(lr);
        if (!existing || dist < existing.dist) byLine.set(lr, { ...v, dist, toward });
      }

      // Resolve names
      const lineRefs = [...byLine.keys()];
      if (!lineRefs.length) { setNearby([]); return; }

      const chunks = [];
      for (let i = 0; i < lineRefs.length; i += 20) chunks.push(lineRefs.slice(i, i + 20));
      const routeResults = await Promise.allSettled(
        chunks.map(chunk => apiFetch('/gtfs_routes/list', { line_refs: chunk.join(','), date: todayStr(), limit: 200, order_by: 'date desc' }))
      );

      const nameMap = new Map();
      for (const r of routeResults) {
        if (r.status !== 'fulfilled') continue;
        for (const route of r.value) {
          if (!nameMap.has(route.line_ref)) nameMap.set(route.line_ref, route);
        }
      }

      const lines = [...byLine.values()]
        .map(v => {
          const route = nameMap.get(v.siri_route__line_ref);
          const name = route?.route_short_name || `${v.siri_route__line_ref}`;
          let etaMin = null;
          if (v.velocity > 0 && v.toward) etaMin = Math.round(v.dist / (v.velocity * 1000 / 60));
          return { ...v, name, etaMin, route };
        })
        .filter(v => v.toward)
        .sort((a, b) => (a.etaMin ?? 999) - (b.etaMin ?? 999))
        .slice(0, 8);

      setNearby(lines);
    } catch (e) {
      console.error('Nearby:', e);
      setNearby([]);
    }
  }, []);

  useEffect(() => {
    if (location.position) loadNearby(location.position);
  }, [location.position, loadNearby]);

  async function handleLocate(mode) {
    setLocateMode(null);
    if (mode === 'gps') {
      try {
        const pos = await location.locateGPS();
        setUserLocation(pos.lat, pos.lon);
        loadNearby(pos);
      } catch {
        // GPS failed
      }
    }
    // 'map' mode would navigate to map with pin mode — simplified for now
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>🚌 Bus Tracker</h1>
        <span style={{ flex: 1 }} />
        <button className="header-btn" onClick={() => setLocateMode('choosing')}>📍</button>
        <button className="header-btn" onClick={() => navigate('/search')}>🔍</button>
      </div>

      {/* Location chooser */}
      {locateMode === 'choosing' && (
        <div className="sheet-overlay" onClick={() => setLocateMode(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span>בחר מיקום</span>
              <button className="sheet-close" onClick={() => setLocateMode(null)}>&times;</button>
            </div>
            <div className="picker-item" onClick={() => handleLocate('gps')}>
              <div className="picker-icon" style={{ background: '#e8f0fe' }}>📡</div>
              <div className="picker-info">
                <div className="picker-title">לפי GPS</div>
                <div className="picker-subtitle">זיהוי מיקום אוטומטי</div>
              </div>
            </div>
            <div className="picker-item" onClick={() => { setLocateMode(null); navigate('/map'); }}>
              <div className="picker-icon" style={{ background: '#fce8e6' }}>📍</div>
              <div className="picker-info">
                <div className="picker-title">בחר על המפה</div>
                <div className="picker-subtitle">לחץ על נקודה במפה</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <>
          <div className="section-title">★ המועדפים שלי</div>
          {favorites.map(fav => {
            const data = favData[fav.id] || {};
            return (
              <div
                key={fav.id}
                className="card"
                onClick={() => trackLine(fav.lineName, [fav.lineRef], [])}
              >
                <div className="card-title">
                  <span className="line-badge">{fav.lineName}</span>
                  <span className="card-agency">{fav.agencyName}</span>
                </div>
                <div className="card-direction">
                  {fav.stopName}{fav.stopCity ? `, ${fav.stopCity}` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {data.vehicles > 0 && <span className="live-badge">LIVE</span>}
                  {data.nextTimes?.length > 0 && (
                    <span style={{ fontSize: 13, color: '#888' }}>
                      הבא: {data.nextTimes.map(t => t.str).join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Empty state */}
      {!favorites.length && (
        <div className="card" onClick={() => navigate('/search')} style={{ cursor: 'pointer', textAlign: 'center', color: '#888', border: '2px dashed #ddd', background: 'transparent', boxShadow: 'none' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>+</div>
          <div style={{ fontSize: 14 }}>חפש קו והוסף למועדפים</div>
        </div>
      )}

      {/* Nearby */}
      {nearby && nearby.length > 0 && (
        <>
          <div className="section-title">קרוב אליי</div>
          <div className="nearby-grid">
            {nearby.map(bus => (
              <div
                key={bus.siri_ride__vehicle_ref}
                className="nearby-cell"
                onClick={() => trackLine(bus.name, [bus.siri_route__line_ref], [])}
              >
                <span className="line-badge">{bus.name}</span>
                <span className="nearby-eta">
                  {bus.etaMin != null ? `~${bus.etaMin} דק'` : 'מתקרב'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <>
          <div className="section-title">חיפושים אחרונים</div>
          <div className="chip-row">
            {recentSearches.slice(0, 6).map(s => (
              <button key={s} className="chip" onClick={() => navigate('/search')}>{s}</button>
            ))}
          </div>
        </>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}
