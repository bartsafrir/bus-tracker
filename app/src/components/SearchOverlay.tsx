import { useState, useRef, useEffect } from 'react';
import { CloseIcon, BackIcon } from './Icons';
import { getOperatorColor } from '../utils/operators';
import { toIsraelTime, israelNow, today } from '../utils/time';
import type { Suggestion } from '../types';

const API_BASE = 'https://open-bus-stride-api.hasadna.org.il';
async function apiFetch(endpoint: string, params: Record<string, any> = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, String(v));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } finally { clearTimeout(t); }
}

function extractCities(name: string) {
  const cleaned = name.replace(/-\d+[#0-9\u05D0-\u05EA]*$/, '');
  const parts = cleaned.split('<->');
  if (parts.length !== 2) return { from: '', to: '' };
  const parse = (s: string) => { const m = s.match(/^(.+)-([^-]+)$/); return m ? { stop: m[1].trim(), city: m[2].trim() } : { stop: s.trim(), city: '' }; };
  const a = parse(parts[0]), b = parse(parts[1]);
  const sameCity = a.city && b.city && a.city === b.city;
  return { from: sameCity ? a.stop : (a.city || a.stop), to: sameCity ? b.stop : (b.city || b.stop) };
}

function fmtDir(from: string, to: string) { return `${from} \u2190 ${to}`; }

function getStatus(r: any) {
  const now = israelNow().totalMinutes;
  if (!r.firstTime || !r.lastTime || !r.rideCount) return { label: 'לא פעיל היום', cls: 'inactive' };
  if (r.rideCount <= 3) return { label: `${r.rideCount} נסיעות בלבד`, cls: now >= r.firstTime.minutes && now <= r.lastTime.minutes + 60 ? 'sparse' : 'inactive' };
  return now >= r.firstTime.minutes - 10 && now <= r.lastTime.minutes + 60 ? { label: 'פעיל עכשיו', cls: 'active' } : { label: 'לא פעיל כרגע', cls: 'inactive' };
}

interface Props {
  suggestions: Suggestion[];
  recentLines: { lineRef: number; lineName: string; agencyName: string; from: string; to: string }[];
  onTrackLine: (lineName: string, lineRefs: number[], agencyName: string, from: string, to: string, siblings?: any) => void;
  onClose: () => void;
}

export default function SearchOverlay({ suggestions, recentLines, onTrackLine, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'operators' | 'directions'>('input');
  const [operators, setOperators] = useState<Map<string, any[]> | null>(null);
  const [directions, setDirections] = useState<{ opName: string; routes: any[] } | null>(null);
  const [lineName, setLineName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Auto-search debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 1) return;
    if (searchTimer.current !== null) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(query), 400);
    return () => { if (searchTimer.current !== null) clearTimeout(searchTimer.current); };
  }, [query]);

  async function doSearch(term?: string) {
    const t = (term || query).trim();
    if (!t) return;
    setLineName(t);
    setLoading(true);
    setStep('input');

    try {
      const routes = await apiFetch('/gtfs_routes/list', { route_short_name: t, date: today(), limit: 200, order_by: 'date desc' });
      const todayDate = today();
      const seen = new Set<number>();
      let unique = routes.filter((r: any) => { if (r.date === todayDate && !seen.has(r.line_ref)) { seen.add(r.line_ref); return true; } return false; });
      if (!unique.length) { seen.clear(); unique = routes.filter((r: any) => { if (!seen.has(r.line_ref)) { seen.add(r.line_ref); return true; } return false; }); }

      if (!unique.length) { setOperators(new Map()); setStep('operators'); setLoading(false); return; }

      const enriched = await Promise.all(unique.map(async (r: any) => {
        try {
          const [first, last] = await Promise.all([
            apiFetch('/gtfs_rides/list', { gtfs_route_id: r.id, limit: 1, order_by: 'start_time asc' }),
            apiFetch('/gtfs_rides/list', { gtfs_route_id: r.id, limit: 1, order_by: 'start_time desc' }),
          ]);
          const allR = await apiFetch('/gtfs_rides/list', { gtfs_route_id: r.id, limit: 200 });
          return {
            ...r,
            firstTime: first[0]?.start_time ? toIsraelTime(new Date(first[0].start_time)) : null,
            lastTime: last[0]?.start_time ? toIsraelTime(new Date(last[0].start_time)) : null,
            rideCount: allR.filter((rd: any) => rd.start_time).length,
          };
        } catch { return { ...r, firstTime: null, lastTime: null, rideCount: 0 }; }
      }));

      const byOp = new Map<string, any[]>();
      for (const r of enriched) {
        if (!byOp.has(r.agency_name)) byOp.set(r.agency_name, []);
        byOp.get(r.agency_name)!.push(r);
      }

      if (byOp.size === 1) {
        const [opName, opRoutes] = [...byOp.entries()][0];
        if (opRoutes.length === 1) {
          const c = extractCities(opRoutes[0].route_long_name);
          onTrackLine(t, [opRoutes[0].line_ref], opName, c.from, c.to);
        } else {
          setDirections({ opName, routes: opRoutes });
          setStep('directions');
        }
      } else {
        setOperators(byOp);
        setStep('operators');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function clear() { setQuery(''); setStep('input'); setOperators(null); setDirections(null); inputRef.current?.focus(); }

  return (
    <div className="search-overlay">
      <div className="search-bar">
        <button className="search-close" onClick={onClose}><CloseIcon size={16} /></button>
        <input ref={inputRef} className="search-field" placeholder="הקלד מספר קו..." inputMode="numeric"
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()} autoFocus />
        {query && <button className="search-clear" onClick={clear}><CloseIcon size={14} /></button>}
      </div>

      {loading && <div className="loading"><div className="spinner" /><span>מחפש...</span></div>}

      {/* Suggestions + recents when empty */}
      {!loading && step === 'input' && !query.trim() && (suggestions.length > 0 || recentLines.length > 0) && (
        <>
          {suggestions.length > 0 && (
            <>
              <div className="section-hdr">✦ מוצע עבורך</div>
              {suggestions.slice(0, 4).map(s => {
                const color = getOperatorColor(s.agencyName);
                return (
                  <div key={s.lineRef} className="picker-item" onClick={() => onTrackLine(s.lineName, [s.lineRef], s.agencyName, s.from, s.to)}>
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
                  <div key={r.lineRef} className="picker-item" onClick={() => onTrackLine(r.lineName, [r.lineRef], r.agencyName, r.from, r.to)}>
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

      {/* Operators */}
      {!loading && step === 'operators' && operators && (
        <>
          <div className="section-hdr">תוצאות לקו {lineName}</div>
          {operators.size === 0 && <div className="empty-msg">לא נמצא קו {lineName}</div>}
          {[...operators.entries()]
            .sort((a, b) => { const aA = a[1].some(r => getStatus(r).cls === 'active'); const bA = b[1].some(r => getStatus(r).cls === 'active'); return aA === bA ? 0 : aA ? -1 : 1; })
            .map(([opName, routes]) => {
              const cities = extractCities(routes[0].route_long_name);
              const best = routes.find(r => getStatus(r).cls === 'active') || routes[0];
              const st = getStatus(best);
              const color = getOperatorColor(opName);
              const hrs = best.firstTime && best.lastTime ? `${best.firstTime.str}-${best.lastTime.str}` : '';
              return (
                <div key={opName} className="picker-item" onClick={() => {
                  if (routes.length === 1) { const c = extractCities(routes[0].route_long_name); onTrackLine(lineName, [routes[0].line_ref], opName, c.from, c.to); }
                  else { setDirections({ opName, routes }); setStep('directions'); }
                }}>
                  <div className="badge-line" style={{ background: color.bg, fontSize: 17, padding: '6px 16px' }}>{lineName}</div>
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

      {/* Directions */}
      {!loading && step === 'directions' && directions && (
        <>
          <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
            <button className="search-close" onClick={() => setStep('operators')}><BackIcon size={16} /></button>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>קו {lineName} · {directions.opName}</span>
          </div>
          {[...directions.routes]
            .sort((a, b) => {
              const order: Record<string, number> = { active: 0, sparse: 1, inactive: 2 };
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
                    const allSibs = directions.routes.map((r: any) => {
                      const sc = extractCities(r.route_long_name);
                      return { lineRef: r.line_ref, from: sc.from, to: sc.to, direction: r.route_direction, alternative: r.route_alternative };
                    });
                    onTrackLine(lineName, [route.line_ref], directions.opName, c.from, c.to, allSibs.length > 1 ? allSibs : null);
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
  );
}
