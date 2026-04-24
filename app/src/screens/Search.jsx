import { useState, useContext } from 'react';
import { AppContext } from '../App';
import { searchRoutes, getRouteHours } from '../api/stride';
import { dedupeRoutes, groupByOperator, extractCities, parseRouteName } from '../utils/routes';
import { toIsraelTime, israelNow } from '../utils/time';
import { todayStr } from '../api/stride';

export default function Search() {
  const { addRecentSearch, recentSearches, trackLine } = useContext(AppContext);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [operators, setOperators] = useState(null); // Map<opName, route[]>
  const [directions, setDirections] = useState(null); // { opName, routes }
  const [lineName, setLineName] = useState('');

  async function doSearch(term) {
    const t = (term || query).trim();
    if (!t) return;
    setQuery(t);
    setLineName(t);
    setDirections(null);
    setOperators(null);
    setLoading(true);

    try {
      addRecentSearch(t);
      const routes = await searchRoutes(t);
      const today = todayStr();
      let unique = dedupeRoutes(routes, today);
      if (!unique.length) unique = dedupeRoutes(routes);
      if (!unique.length) { setOperators(new Map()); setLoading(false); return; }

      // Enrich with hours in parallel
      const enriched = await Promise.all(
        unique.map(async r => {
          try {
            const hours = await getRouteHours(r.id);
            return {
              ...r,
              firstTime: hours.firstTime ? toIsraelTime(new Date(hours.firstTime)) : null,
              lastTime: hours.lastTime ? toIsraelTime(new Date(hours.lastTime)) : null,
              rideCount: hours.rideCount,
            };
          } catch {
            return { ...r, firstTime: null, lastTime: null, rideCount: 0 };
          }
        })
      );

      const byOp = groupByOperator(enriched);

      if (byOp.size === 1) {
        const [opName, opRoutes] = [...byOp.entries()][0];
        if (opRoutes.length === 1) {
          trackLine(t, [opRoutes[0].line_ref], opRoutes);
        } else {
          setDirections({ opName, routes: sortByStatus(opRoutes) });
        }
      } else {
        setOperators(byOp);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function pickOperator(opName, routes) {
    if (routes.length === 1) {
      trackLine(lineName, [routes[0].line_ref], routes);
    } else {
      setDirections({ opName, routes: sortByStatus(routes) });
      setOperators(null);
    }
  }

  function pickDirection(route) {
    trackLine(lineName, [route.line_ref], [route]);
  }

  function pickAllDirections(routes) {
    const active = routes.filter(r => getStatus(r).cls !== 'inactive');
    const refs = (active.length ? active : routes).map(r => r.line_ref);
    trackLine(lineName, refs, routes);
  }

  return (
    <div className="screen">
      <div className="header">
        {directions && (
          <button className="header-btn" onClick={() => { setDirections(null); setOperators(null); doSearch(lineName); }}>
            →
          </button>
        )}
        <input
          className="search-input"
          type="text"
          placeholder="מספר קו"
          inputMode="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
        />
        <button className="search-btn" onClick={() => doSearch()}>חפש</button>
      </div>

      {loading && <div className="loading-box"><div className="spinner" /><span>מחפש...</span></div>}

      {!loading && !operators && !directions && (
        <>
          {recentSearches.length > 0 && (
            <>
              <div className="section-title">חיפושים אחרונים</div>
              <div className="chip-row">
                {recentSearches.map(s => (
                  <button key={s} className="chip" onClick={() => doSearch(s)}>{s}</button>
                ))}
              </div>
            </>
          )}
          {!recentSearches.length && (
            <div className="empty-state">
              <div className="emoji">🔍</div>
              <p>הקלד מספר קו לחיפוש</p>
            </div>
          )}
        </>
      )}

      {operators && !directions && (
        <>
          <div className="section-title">תוצאות לקו {lineName}</div>
          {operators.size === 0 && (
            <div className="empty-state"><p>לא נמצא קו {lineName}</p></div>
          )}
          {[...operators.entries()]
            .sort((a, b) => {
              const aActive = a[1].some(r => getStatus(r).cls === 'active');
              const bActive = b[1].some(r => getStatus(r).cls === 'active');
              if (aActive !== bActive) return aActive ? -1 : 1;
              return b[1].reduce((s, r) => s + (r.rideCount || 0), 0) - a[1].reduce((s, r) => s + (r.rideCount || 0), 0);
            })
            .map(([opName, routes]) => {
              const cities = extractCities(routes[0].route_long_name);
              const bestRoute = routes.find(r => getStatus(r).cls === 'active') || routes[0];
              const status = getStatus(bestRoute);
              const hours = bestRoute.firstTime && bestRoute.lastTime
                ? `${bestRoute.firstTime.str}-${bestRoute.lastTime.str}` : '';
              const count = routes.reduce((s, r) => s + (r.rideCount || 0), 0);

              return (
                <div key={opName} className="picker-item" onClick={() => pickOperator(opName, routes)}>
                  <div className="picker-icon operator">🚌</div>
                  <div className="picker-info">
                    <div className="picker-title">{opName}</div>
                    <div className="picker-subtitle">
                      {cities.fromCity} ↔ {cities.toCity}
                      {hours && <> · <span className="picker-hours">{hours}</span></>}
                      {count > 0 && <> · {count} נסיעות</>}
                    </div>
                    <span className={`status-badge ${status.cls}`}>{status.label}</span>
                  </div>
                  <div style={{ color: '#ccc', fontSize: 18 }}>‹</div>
                </div>
              );
            })}
        </>
      )}

      {directions && (
        <>
          <div className="section-title">קו {lineName} · {directions.opName}</div>
          {directions.routes.length > 1 && (
            <div className="picker-item" onClick={() => pickAllDirections(directions.routes)}>
              <div className="picker-icon direction">⟷</div>
              <div className="picker-info">
                <div className="picker-title">כל הכיוונים הפעילים</div>
              </div>
            </div>
          )}
          {directions.routes.map(route => {
            const cities = extractCities(route.route_long_name);
            const status = getStatus(route);
            const alt = route.route_alternative && route.route_alternative !== '#' && route.route_alternative !== '0'
              ? ` · חלופה ${route.route_alternative}` : '';
            const hours = route.firstTime && route.lastTime
              ? `${route.firstTime.str}-${route.lastTime.str}` : '';

            return (
              <div
                key={route.line_ref}
                className="picker-item"
                style={{ opacity: status.cls === 'inactive' ? 0.5 : 1 }}
                onClick={() => pickDirection(route)}
              >
                <div className="picker-icon direction">→</div>
                <div className="picker-info">
                  <div className="picker-title">{cities.fromCity} → {cities.toCity}</div>
                  <div className="picker-subtitle">
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

function getStatus(route) {
  const nowMin = israelNow().totalMinutes;
  if (!route.firstTime || !route.lastTime || route.rideCount === 0) {
    return { label: 'לא פעיל היום', cls: 'inactive' };
  }
  if (route.rideCount <= 3) {
    const isActive = nowMin >= route.firstTime.minutes && nowMin <= route.lastTime.minutes + 60;
    return { label: `${route.rideCount} נסיעות בלבד`, cls: isActive ? 'sparse' : 'inactive' };
  }
  const isActive = nowMin >= route.firstTime.minutes - 10 && nowMin <= route.lastTime.minutes + 60;
  return isActive ? { label: 'פעיל עכשיו', cls: 'active' } : { label: 'לא פעיל כרגע', cls: 'inactive' };
}

function sortByStatus(routes) {
  const order = { active: 0, sparse: 1, inactive: 2 };
  return [...routes].sort((a, b) => (order[getStatus(a).cls] ?? 2) - (order[getStatus(b).cls] ?? 2));
}
