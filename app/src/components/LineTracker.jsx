import { toIsraelTime, israelNow } from '../utils/time';
import { apiFetch } from '../api/stride';
import { useState, useEffect } from 'react';

export default function LineTracker({ lineName, agencyName, vehicles, closestStop, operatorColor, isFavorite, onToggleFavorite, onOpenSchedule, scheduleData }) {
  const [nextTimes, setNextTimes] = useState([]);

  useEffect(() => {
    if (!scheduleData?.todayGtfsRouteId) return;
    let cancelled = false;
    async function load() {
      const rides = await apiFetch('/gtfs_rides/list', { gtfs_route_id: scheduleData.todayGtfsRouteId, limit: 200, order_by: 'start_time asc' });
      if (cancelled) return;
      const now = israelNow().totalMinutes;

      if (closestStop && scheduleData.stopOffsets) {
        const info = scheduleData.stopOffsets.get(closestStop.gtfs_stop_id);
        if (info) {
          const times = rides.filter(r => r.start_time).map(r => {
            const arrival = new Date(new Date(r.start_time).getTime() + info.offsetMs);
            return toIsraelTime(arrival);
          }).filter(t => t.minutes >= now).slice(0, 4);
          setNextTimes(times);
          return;
        }
      }
      // Fallback: ride start times
      const times = rides.filter(r => r.start_time).map(r => toIsraelTime(new Date(r.start_time))).filter(t => t.minutes >= now).slice(0, 4);
      setNextTimes(times);
    }
    load();
    return () => { cancelled = true; };
  }, [scheduleData, closestStop]);

  // Find closest live bus ETA
  let liveEta = null;
  if (vehicles.length > 0 && closestStop && scheduleData?.stopOffsets) {
    const stopInfo = scheduleData.stopOffsets.get(closestStop.gtfs_stop_id);
    if (stopInfo?.shapeDist != null) {
      for (const v of vehicles) {
        const remaining = stopInfo.shapeDist - (v.distance_from_journey_start || 0);
        if (remaining > 0 && v.velocity > 0) {
          const eta = Math.max(1, Math.round(remaining / (v.velocity * 1000 / 60)));
          if (liveEta === null || eta < liveEta) liveEta = eta;
        }
      }
    }
  }

  const stopName = closestStop?.gtfs_stop__name || '';
  const stopCity = closestStop?.gtfs_stop__city || '';

  return (
    <div>
      {closestStop && (
        <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>🟡 {stopName}{stopCity ? `, ${stopCity}` : ''}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>התחנה הקרובה אליך</div>
          </div>
          <button className={`star-btn ${isFavorite ? 'on' : 'off'}`} onClick={onToggleFavorite}>
            {isFavorite ? '★' : '☆'}
          </button>
        </div>
      )}

      <div style={{ padding: '6px 20px 14px' }}>
        {liveEta !== null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="live-badge">LIVE</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#34a853' }}>~{liveEta} דק'</span>
          </div>
        ) : vehicles.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="live-badge">LIVE</span>
            <span style={{ fontSize: 16, color: '#34a853', fontWeight: 600 }}>{vehicles.length} אוטובוסים במעקב</span>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>אין מעקב חי כרגע</div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {nextTimes.length > 0 && (
            <>
              <span style={{ fontSize: 13, color: '#888' }}>הבא:</span>
              {nextTimes.map((t, i) => (
                <span key={i} style={{ fontSize: 14, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#1a73e8' : '#888' }}>{t.str}</span>
              ))}
            </>
          )}
          {closestStop && (
            <span style={{ fontSize: 12, color: '#1a73e8', marginRight: 'auto', cursor: 'pointer' }} onClick={onOpenSchedule}>
              לוח מלא ←
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
