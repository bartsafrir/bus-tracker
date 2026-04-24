import { SearchIcon } from './Icons';
import { getOperatorColor } from '../utils/operators';

interface Props {
  suggestions: any[];
  suggestionsLive: Record<number, any>;
  nearbyBuses: any[];
  recentLines: any[];
  fmtDir: (from: string, to: string) => string;
  onTrackLine: (...args: any[]) => void;
  onSearch: () => void;
}

export default function HomeSheet({ suggestions, suggestionsLive, nearbyBuses, recentLines, fmtDir, onTrackLine, onSearch }: Props) {
  return (
    <div>
      {/* Smart suggestions */}
      {suggestions.length > 0 && (
        <>
          <div className="section-hdr">✦ מוצע עבורך</div>
          {suggestions.map(s => {
            const c = getOperatorColor(s.agencyName);
            const live = suggestionsLive[s.lineRef];
            return (
              <div key={s.lineRef} className="row" onClick={() => onTrackLine(s.lineName, [s.lineRef], s.agencyName, s.from, s.to)}>
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
                onClick={() => onTrackLine(b.name, [b.siri_route__line_ref], b.agency, b.from, b.to)}>
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
        <div className="row" onClick={onSearch} style={{ justifyContent: 'center', color: 'var(--text2)', fontWeight: 500 }}>
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
                  onClick={() => onTrackLine(r.lineName, [r.lineRef], r.agencyName, r.from, r.to)}>
                  <span style={{ background: c.bg, color: 'white', padding: '1px 6px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{r.lineName}</span>
                  <span style={{ fontSize: 12 }}>{r.from || r.agencyName}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
