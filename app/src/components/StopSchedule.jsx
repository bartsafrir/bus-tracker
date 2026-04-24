import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api/stride';
import { toIsraelTime, israelNow, formatCountdown } from '../utils/time';

export default function StopSchedule({ stop, lineName, lineRefs, scheduleData, vehicles, operatorColor, isFavorite, onToggleFavorite, onClose }) {
  const [arrivals, setArrivals] = useState(null);
  const listRef = useRef(null);

  const stopName = stop.gtfs_stop__name || `תחנה ${stop.stop_sequence}`;
  const city = stop.gtfs_stop__city || '';
  const stopId = stop.gtfs_stop_id;
  const stopInfo = scheduleData?.stopOffsets?.get(stopId);

  useEffect(() => {
    if (!stopInfo || !scheduleData?.todayGtfsRouteId) return;
    let cancelled = false;

    async function load() {
      const rides = await apiFetch('/gtfs_rides/list', { gtfs_route_id: scheduleData.todayGtfsRouteId, limit: 200, order_by: 'start_time asc' });
      if (cancelled) return;
      const rideStarts = rides.filter(r => r.start_time).map(r => new Date(r.start_time).getTime());

      const liveByStart = new Map();
      for (const v of vehicles) {
        if (!v.siri_ride__scheduled_start_time) continue;
        liveByStart.set(v.siri_ride__scheduled_start_time.substring(11, 16), v);
      }

      const arr = rideStarts.map(startMs => {
        const arrivalUTC = new Date(startMs + stopInfo.offsetMs);
        const israel = toIsraelTime(arrivalUTC);
        const startKey = new Date(startMs).toISOString().substring(11, 16);
        const live = liveByStart.get(startKey) || null;
        let liveEtaMin = null, busPassed = false;
        if (live && stopInfo.shapeDist != null) {
          const remaining = stopInfo.shapeDist - (live.distance_from_journey_start || 0);
          if (remaining <= -200) busPassed = true;
          else if (remaining > 0 && live.velocity > 0) liveEtaMin = Math.max(1, Math.round(remaining / (live.velocity * 1000 / 60)));
        }
        return { ...israel, live, liveEtaMin, busPassed };
      }).sort((a, b) => a.minutes - b.minutes);

      setArrivals(arr);
    }
    load();
    return () => { cancelled = true; };
  }, [stopId, stopInfo, scheduleData, vehicles]);

  useEffect(() => {
    if (!arrivals) return;
    requestAnimationFrame(() => {
      listRef.current?.querySelector('.sched-highlight')?.scrollIntoView({ block: 'center' });
    });
  }, [arrivals]);

  const nowMin = israelNow().totalMinutes;
  let foundNext = false;

  return (
    <div>
      <div style={{ padding: '10px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            <span style={{ display: 'inline-block', background: operatorColor, color: 'white', padding: '1px 8px', borderRadius: 6, fontSize: 14, fontWeight: 800, marginLeft: 6 }}>{lineName}</span>
            {stopName}
          </div>
          {city && <div style={{ fontSize: 12, color: '#888' }}>{city}</div>}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className={`star-btn ${isFavorite ? 'on' : 'off'}`} onClick={onToggleFavorite}>{isFavorite ? '★' : '☆'}</button>
          <button style={{ background: 'none', border: 'none', fontSize: 22, color: '#ccc', cursor: 'pointer' }} onClick={onClose}>&times;</button>
        </div>
      </div>

      {!arrivals && <div className="loading"><div className="spinner" /><span>טוען לוח זמנים...</span></div>}

      {arrivals && (
        <div ref={listRef}>
          {arrivals.length === 0 && <div className="empty-msg">לא נמצא לוח זמנים</div>}
          {arrivals.map((arr, i) => {
            const isPast = arr.busPassed || (!arr.live && arr.minutes < nowMin);
            const isNext = !isPast && !foundNext;
            if (isNext) foundNext = true;
            const diff = arr.minutes - nowMin;

            let right;
            if (arr.live && !arr.busPassed) {
              right = <><span className="live-badge">LIVE</span><span className="sched-cd live">{arr.liveEtaMin != null ? `~${arr.liveEtaMin} דק'` : 'בדרך'}</span></>;
            } else if (arr.busPassed) {
              right = <span className="passed-badge">עבר</span>;
            } else if (!isPast) {
              right = <span className={`sched-cd ${isNext ? 'next' : ''}`}>{formatCountdown(diff)}</span>;
            }

            return (
              <div key={i} className={`sched-item ${isNext ? 'sched-highlight' : ''}`}>
                <span className={`sched-time ${isPast ? 'past' : ''} ${isNext ? 'next' : ''}`}>{arr.str}</span>
                <div className="sched-right">{right}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
