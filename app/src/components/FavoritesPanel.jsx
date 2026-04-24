import { useState, useEffect, useCallback } from 'react';
import { getVehicleLocations, getNearbyVehicles, apiFetch, todayStr } from '../api/stride';
import { latestPerVehicle } from '../utils/routes';
import { toIsraelTime, israelNow } from '../utils/time';
import { distanceM, isMovingToward } from '../utils/geo';
import { getOperatorColor } from '../utils/operators';

export default function FavoritesPanel({ favorites, recentSearches, userLocation, onTrackLine, onSearch, onLocate }) {
  const [favData, setFavData] = useState({});
  const [nearby, setNearby] = useState(null);

  // Load fav live data
  useEffect(() => {
    if (!favorites.length) return;
    let cancelled = false;

    async function load() {
      const data = {};
      await Promise.allSettled(favorites.map(async fav => {
        try {
          const vehicles = latestPerVehicle(await getVehicleLocations(fav.lineRef).catch(() => []));
          const todayRoutes = await apiFetch('/gtfs_routes/list', { line_refs: fav.lineRef, date: todayStr(), limit: 1, order_by: 'date desc' });
          const routeId = todayRoutes[0]?.id;
          let nextTimes = [];
          if (routeId) {
            const rides = await apiFetch('/gtfs_rides/list', { gtfs_route_id: routeId, limit: 200, order_by: 'start_time asc' });
            const now = israelNow().totalMinutes;
            nextTimes = rides.filter(r => r.start_time).map(r => toIsraelTime(new Date(r.start_time))).filter(t => t.minutes >= now).slice(0, 3);
          }
          data[fav.id] = { count: vehicles.length, nextTimes };
        } catch { data[fav.id] = { count: 0, nextTimes: [] }; }
      }));
      if (!cancelled) setFavData(data);
    }
    load();
    const iv = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [favorites]);

  // Nearby
  const loadNearby = useCallback(async () => {
    if (!userLocation) return;
    try {
      const locs = await getNearbyVehicles(userLocation.lat, userLocation.lon);
      const latest = latestPerVehicle(locs);
      const byLine = new Map();
      for (const v of latest) {
        const lr = v.siri_route__line_ref;
        const dist = distanceM(userLocation.lat, userLocation.lon, v.lat, v.lon);
        const toward = isMovingToward(v.lat, v.lon, v.bearing, userLocation.lat, userLocation.lon);
        const ex = byLine.get(lr);
        if (!ex || dist < ex.dist) byLine.set(lr, { ...v, dist, toward });
      }
      const refs = [...byLine.keys()];
      if (!refs.length) { setNearby([]); return; }
      const chunks = []; for (let i = 0; i < refs.length; i += 20) chunks.push(refs.slice(i, i + 20));
      const rr = await Promise.allSettled(chunks.map(c => apiFetch('/gtfs_routes/list', { line_refs: c.join(','), date: todayStr(), limit: 200, order_by: 'date desc' })));
      const nameMap = new Map();
      for (const r of rr) { if (r.status === 'fulfilled') for (const rt of r.value) if (!nameMap.has(rt.line_ref)) nameMap.set(rt.line_ref, rt); }
      const lines = [...byLine.values()]
        .map(v => { const rt = nameMap.get(v.siri_route__line_ref); return { ...v, name: rt?.route_short_name || '?', agency: rt?.agency_name || '', etaMin: v.velocity > 0 && v.toward ? Math.round(v.dist / (v.velocity * 1000 / 60)) : null }; })
        .filter(v => v.toward).sort((a, b) => (a.etaMin ?? 999) - (b.etaMin ?? 999)).slice(0, 6);
      setNearby(lines);
    } catch { setNearby([]); }
  }, [userLocation]);

  useEffect(() => { loadNearby(); }, [loadNearby]);

  return (
    <div>
      {/* Favorites */}
      {favorites.length > 0 && (
        <>
          <div className="section-hdr">★ המועדפים שלי</div>
          {favorites.map(fav => {
            const d = favData[fav.id] || {};
            const color = getOperatorColor(fav.agencyName);
            return (
              <div key={fav.id} className="row" onClick={() => onTrackLine(fav.lineName, [fav.lineRef], fav.agencyName)}>
                <div className="badge-line" style={{ background: color.bg }}>{fav.lineName}</div>
                <div className="row-info">
                  <div className="row-title">{fav.agencyName} · {fav.stopName}</div>
                  <div className="row-sub">
                    {d.count > 0 && <span className="live-badge">LIVE</span>}
                    {d.nextTimes?.length > 0 && <span style={{ marginRight: 6 }}>הבא: {d.nextTimes.map(t => t.str).join(' · ')}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {!favorites.length && (
        <div className="row" onClick={onSearch} style={{ justifyContent: 'center', color: '#888', borderBottom: 'none' }}>
          <span style={{ fontSize: 20, marginLeft: 8 }}>+</span> חפש קו והוסף למועדפים
        </div>
      )}

      {/* Nearby */}
      {nearby && nearby.length > 0 && (
        <>
          <div className="section-hdr">📍 קרוב אליי</div>
          <div className="nearby-grid">
            {nearby.map(b => {
              const color = getOperatorColor(b.agency);
              return (
                <div key={b.siri_ride__vehicle_ref} className="nearby-cell" onClick={() => onTrackLine(b.name, [b.siri_route__line_ref], b.agency)}>
                  <span className="badge-line" style={{ background: color.bg, fontSize: 13, padding: '2px 8px' }}>{b.name}</span>
                  <span className="nearby-eta">{b.etaMin != null ? `~${b.etaMin} דק'` : 'מתקרב'}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Recent */}
      {recentSearches.length > 0 && (
        <>
          <div className="section-hdr">חיפושים אחרונים</div>
          <div className="chip-row">
            {recentSearches.slice(0, 6).map(s => (
              <button key={s} className="chip" onClick={onSearch}>{s}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
