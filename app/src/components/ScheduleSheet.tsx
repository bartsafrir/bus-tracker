import { CloseIcon } from './Icons';

interface Props {
  selectedStop: any;
  tracked: any;
  schedule: any[] | null;
  opColor: string;
  walkMin: number | null;
  onClose: () => void;
}

export default function ScheduleSheet({ selectedStop, tracked, schedule, opColor, walkMin, onClose }: Props) {
  return (
    <div>
      {/* Header */}
      <div className="sched-head">
        <div>
          <div className="sched-title">
            <span className="sched-line-badge" style={{ background: opColor }}>{tracked?.lineName}</span>
            {selectedStop.gtfs_stop__name || 'תחנה'}
          </div>
          <div className="sched-sub">
            {selectedStop.gtfs_stop__code ? `תחנה ${selectedStop.gtfs_stop__code} · ` : ''}
            {selectedStop.gtfs_stop__city ? `${selectedStop.gtfs_stop__city} · ` : ''}
            {tracked?.agencyName}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="sched-close" onClick={onClose}><CloseIcon size={16} /></button>
        </div>
      </div>

      {!schedule && <div className="loading"><div className="spinner" /><span>טוען לוח זמנים...</span></div>}

      {schedule && (() => {
        const past: any[] = [];
        const upcoming: any[] = [];
        let foundNext = false;
        const todayIL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

        for (const a of schedule) {
          if (a.cancelled) { past.push({ ...a, isCancelled: true }); continue; }
          const isPast = a.passed || (!a.live && a.diffMin < -2);
          if (isPast) { past.push(a); continue; }
          const mins = a.live && a.liveEta != null ? a.liveEta : Math.max(0, a.diffMin);
          const arrDateIL = new Date(a.arrivalMs).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
          const isTomorrow = arrDateIL > todayIL;
          const isLive = !!a.live;
          const isDelayed = a.delayMin > 3;
          const cantCatch = walkMin != null && mins < walkMin;
          const tooClose = cantCatch;
          const isNext = !tooClose && !foundNext;
          if (isNext) foundNext = true;
          upcoming.push({ ...a, mins, isNext, isLive, isDelayed, tooClose, isTomorrow });
        }

        return (
          <>
            {past.length > 0 && (() => {
              const cancelledCount = past.filter(a => a.isCancelled).length;
              const passedCount = past.length - cancelledCount;
              return (
                <div className="sc-past-bar">
                  <span>
                    {passedCount > 0 && `${passedCount} נסיעות עברו`}
                    {cancelledCount > 0 && <span className="sc-cancelled-count">{passedCount > 0 ? ' · ' : ''}{cancelledCount} בוטלו</span>}
                  </span>
                  <div className="sc-past-line" />
                </div>
              );
            })()}

            {upcoming.length === 0 && past.length > 0 && (() => {
              const nextRide = schedule.find((a: any) => a.diffMin > 0);
              let nextLabel = '';
              if (nextRide) {
                const rideDate = new Date(nextRide.arrivalMs).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
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

            {upcoming.map((a, i) => {
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
                      {a.isDelayed && <span className="sc-delay">איחור {a.delayMin} דק'</span>}
                      {a.tooClose && <span className="sc-miss">לא תספיק</span>}
                    </div>
                    <div className="sc-clock-col">
                      <div className="sc-clock-sched">{a.str}{a.isTomorrow && <span className="sc-tomorrow">מחר</span>}</div>
                    </div>
                  </div>
                );
              }

              const far = a.mins > 60;
              return (
                <div key={i} className={`sc-row ${far ? 'faded' : ''} ${a.tooClose ? 'faded' : ''}`}>
                  <div className="sc-mins-col">
                    <div className={`sc-mins-big ${a.isNext ? 'next' : ''}`}>{a.mins}</div>
                    <div className="sc-mins-label">דק'</div>
                  </div>
                  <div className="sc-row-mid">
                    {a.isDelayed && <span className="sc-delay">איחור {a.delayMin} דק'</span>}
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
  );
}
