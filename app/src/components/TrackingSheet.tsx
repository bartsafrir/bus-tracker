import { SwapIcon, WalkIcon } from './Icons';

interface Props {
  tracked: any;
  closestStop: any;
  vehicles: any[];
  liveEta: number | null;
  liveStopsAway: number | null;
  walkMin: number | null;
  walkDist: number | null;
  showDirPicker: boolean;
  fmtDir: (from: string, to: string) => string;
  onToggleDirPicker: () => void;
  onSwapDirection: () => void;
  onPickDirection: (sibling: any) => void;
  onOpenSchedule: (stop: any) => void;
}

export default function TrackingSheet({
  tracked, closestStop, vehicles, liveEta, liveStopsAway, walkMin, walkDist,
  showDirPicker, fmtDir, onToggleDirPicker, onSwapDirection, onPickDirection, onOpenSchedule
}: Props) {
  return (
    <div>
      {/* Direction bar */}
      {tracked?.from && (
        <div className="dir-bar">
          <div className="dir-bar-text" onClick={() => tracked?.siblings?.length > 1 && onToggleDirPicker()}>
            {fmtDir(tracked.from, tracked.to)}
            {tracked?.siblings?.length > 1 && <span className="dir-bar-more"> ▾</span>}
          </div>
          {tracked?.siblings?.length > 1 && (
            <button className="dir-swap-btn" onClick={onSwapDirection}>
              <SwapIcon size={16} color="var(--text1)" />
            </button>
          )}
        </div>
      )}

      {/* Full direction picker */}
      {showDirPicker && tracked?.siblings && (
        <div className="dir-picker">
          {tracked.siblings.map((s: any) => (
            <div key={s.lineRef}
              className={`dir-picker-item ${s.lineRef === tracked.lineRefs[0] ? 'active' : ''}`}
              onClick={() => onPickDirection(s)}>
              <span className="dir-picker-label">{fmtDir(s.from, s.to)}</span>
              {s.lineRef === tracked.lineRefs[0] && <span className="dir-picker-check">✓</span>}
            </div>
          ))}
        </div>
      )}

      {/* Closest stop card */}
      {closestStop && (
        <div className="stop-card">
          <div>
            <div className="stop-name">{closestStop.gtfs_stop__name || 'תחנה'}{closestStop.gtfs_stop__city ? `, ${closestStop.gtfs_stop__city}` : ''}</div>
            <div className="stop-sub">
              {closestStop.gtfs_stop__code ? `תחנה ${closestStop.gtfs_stop__code} · ` : ''}
              <WalkIcon size={13} color="var(--walk-text)" />
              {' '}{walkMin != null ? `${walkMin} דק' הליכה` : 'התחנה הקרובה'}
              {walkDist != null ? ` · ${walkDist < 1000 ? Math.round(walkDist) + ' מ\'' : (walkDist/1000).toFixed(1) + ' ק"מ'}` : ''}
            </div>
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

      {/* Schedule link */}
      {closestStop && (
        <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => onOpenSchedule(closestStop)}>
          <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>צפה בלוח זמנים מלא →</span>
        </div>
      )}

      {/* Empty state */}
      {!closestStop && !vehicles.length && (
        <div className="empty-msg">אין מעקב חי כרגע</div>
      )}
    </div>
  );
}
