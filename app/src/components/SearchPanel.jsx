import { useState, useRef, useEffect } from 'react';
import { searchRoutes, getRouteHours, todayStr } from '../api/stride';
import { dedupeRoutes, groupByOperator, extractCities } from '../utils/routes';
import { toIsraelTime, israelNow } from '../utils/time';
import { getOperatorColor } from '../utils/operators';

function getStatus(route) {
  const now = israelNow().totalMinutes;
  if (!route.firstTime || !route.lastTime || route.rideCount === 0) return { label: 'לא פעיל היום', cls: 'inactive' };
  if (route.rideCount <= 3) {
    const active = now >= route.firstTime.minutes && now <= route.lastTime.minutes + 60;
    return { label: `${route.rideCount} נסיעות בלבד`, cls: active ? 'sparse' : 'inactive' };
  }
  const active = now >= route.firstTime.minutes - 10 && now <= route.lastTime.minutes + 60;
  return active ? { label: 'פעיל עכשיו', cls: 'active' } : { label: 'לא פעיל כרגע', cls: 'inactive' };
}

export default function SearchPanel({ recentSearches, addRecentSearch, onTrackLine, onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // 'input' | 'operators' | 'directions'
  const [operators, setOperators] = useState(null);
  const [directions, setDirections] = useState(null);
  const [lineName, setLineName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function doSearch(term) {
    const t = (term || query).trim();
    if (!t) return;
    setQuery(t); setLineName(t); setLoading(true); setStep('input');
    try {
      addRecentSearch(t);
      const routes = await searchRoutes(t);
      const today = todayStr();
      let unique = dedupeRoutes(routes, today);
      if (!unique.length) unique = dedupeRoutes(routes);
      if (!unique.length) { setOperators(new Map()); setStep('operators'); setLoading(false); return; }

      const enriched = await Promise.all(unique.map(async r => {
        try {
          const h = await getRouteHours(r.id);
          return { ...r, firstTime: h.firstTime ? toIsraelTime(new Date(h.firstTime)) : null, lastTime: h.lastTime ? toIsraelTime(new Date(h.lastTime)) : null, rideCount: h.rideCount };
        } catch { return { ...r, firstTime: null, lastTime: null, rideCount: 0 }; }
      }));

      const byOp = groupByOperator(enriched);
      if (byOp.size === 1) {
        const [opName, opRoutes] = [...byOp.entries()][0];
        if (opRoutes.length === 1) { onTrackLine(t, [opRoutes[0].line_ref], opName); }
        else { setDirections({ opName, routes: sortByStatus(opRoutes) }); setStep('directions'); }
      } else {
        setOperators(byOp); setStep('operators');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function pickOp(opName, routes) {
    if (routes.length === 1) { onTrackLine(lineName, [routes[0].line_ref], opName); return; }
    setDirections({ opName, routes: sortByStatus(routes) }); setStep('directions');
  }

  return (
    <div>
      {/* Search bar */}
      <div style={{ padding: '12px 20px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }} onClick={onClose}>✕</button>
        <input
          ref={inputRef}
          style={{ flex: 1, background: '#f5f5f5', border: 'none', borderRadius: 12, padding: '10px 16px', fontSize: 16, outline: 'none', direction: 'ltr', textAlign: 'center' }}
          placeholder="מספר קו"
          inputMode="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
        />
        <button style={{ background: '#1a73e8', color: 'white', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }} onClick={() => doSearch()}>חפש</button>
      </div>

      {loading && <div className="loading"><div className="spinner" /><span>מחפש...</span></div>}

      {/* Initial — recent */}
      {!loading && step === 'input' && recentSearches.length > 0 && (
        <>
          <div className="section-hdr">חיפושים אחרונים</div>
          <div className="chip-row">
            {recentSearches.map(s => <button key={s} className="chip" onClick={() => doSearch(s)}>{s}</button>)}
          </div>
        </>
      )}

      {/* Operators */}
      {!loading && step === 'operators' && operators && (
        <>
          <div className="section-hdr">תוצאות לקו {lineName}</div>
          {operators.size === 0 && <div className="empty-msg">לא נמצא קו {lineName}</div>}
          {[...operators.entries()]
            .sort((a, b) => {
              const aA = a[1].some(r => getStatus(r).cls === 'active');
              const bA = b[1].some(r => getStatus(r).cls === 'active');
              if (aA !== bA) return aA ? -1 : 1;
              return b[1].reduce((s, r) => s + (r.rideCount || 0), 0) - a[1].reduce((s, r) => s + (r.rideCount || 0), 0);
            })
            .map(([opName, routes]) => {
              const cities = extractCities(routes[0].route_long_name);
              const best = routes.find(r => getStatus(r).cls === 'active') || routes[0];
              const status = getStatus(best);
              const color = getOperatorColor(opName);
              const hours = best.firstTime && best.lastTime ? `${best.firstTime.str}-${best.lastTime.str}` : '';
              const count = routes.reduce((s, r) => s + (r.rideCount || 0), 0);

              return (
                <div key={opName} className="picker-item" onClick={() => pickOp(opName, routes)}>
                  <div className="badge-line" style={{ background: color.bg }}>{lineName}</div>
                  <div className="picker-info">
                    <div className="picker-title">{opName}</div>
                    <div className="picker-sub">
                      {cities.fromCity} ↔ {cities.toCity}
                      {hours && <> · <span className="picker-hours">{hours}</span></>}
                      {count > 0 && <> · {count} נסיעות</>}
                    </div>
                    <span className={`status-badge ${status.cls}`}>{status.label}</span>
                  </div>
                  <span style={{ color: '#ccc', fontSize: 18 }}>‹</span>
                </div>
              );
            })}
        </>
      )}

      {/* Directions */}
      {!loading && step === 'directions' && directions && (
        <>
          <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f0f0f0' }}>
            <button style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer' }} onClick={() => setStep('operators')}>→</button>
            <span style={{ fontWeight: 700, fontSize: 15 }}>קו {lineName} · {directions.opName}</span>
          </div>
          {directions.routes.map(route => {
            const cities = extractCities(route.route_long_name);
            const status = getStatus(route);
            const color = getOperatorColor(directions.opName);
            const alt = route.route_alternative && route.route_alternative !== '#' && route.route_alternative !== '0'
              ? ` · חלופה ${route.route_alternative}` : '';
            const hours = route.firstTime && route.lastTime ? `${route.firstTime.str}-${route.lastTime.str}` : '';

            return (
              <div key={route.line_ref} className="picker-item" style={{ opacity: status.cls === 'inactive' ? 0.4 : 1 }}
                onClick={() => onTrackLine(lineName, [route.line_ref], directions.opName)}>
                <div style={{ width: 40, height: 40, background: status.cls === 'inactive' ? '#f1f3f4' : '#e6f4ea', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>→</div>
                <div className="picker-info">
                  <div className="picker-title">{cities.fromCity} → {cities.toCity}</div>
                  <div className="picker-sub">
                    כיוון {route.route_direction}{alt}
                    {hours && <> · <span className="picker-hours">{hours}</span></>}
                    {route.rideCount > 0 && <> · {route.rideCount} נסיעות</>}
                  </div>
                  <span className={`status-badge ${status.cls}`}>{status.label}</span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function sortByStatus(routes) {
  const order = { active: 0, sparse: 1, inactive: 2 };
  return [...routes].sort((a, b) => {
    const aS = a.firstTime && a.lastTime && a.rideCount > 3 ? 'active' : 'inactive';
    const bS = b.firstTime && b.lastTime && b.rideCount > 3 ? 'active' : 'inactive';
    return (order[aS] ?? 2) - (order[bS] ?? 2);
  });
}
