const IL_TZ = 'Asia/Jerusalem';

// Get Israel local time as { hours, minutes, totalMinutes }
export function israelNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour').value);
  const m = parseInt(parts.find(p => p.type === 'minute').value);
  return { hours: h, minutes: m, totalMinutes: h * 60 + m };
}

// Convert UTC Date to Israel HH:MM string and total minutes
export function toIsraelTime(date) {
  const s = date.toLocaleString('en-GB', {
    timeZone: IL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [hh, mm] = s.split(':').map(Number);
  return { str: s, minutes: hh * 60 + mm };
}

export function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatCountdown(diffMinutes) {
  if (diffMinutes <= 0) return 'עכשיו';
  if (diffMinutes < 60) return `בעוד ${diffMinutes} דק'`;
  return `בעוד ${Math.floor(diffMinutes / 60)} שע' ${diffMinutes % 60} דק'`;
}

// GTFS service day: use Israel date. Before 4am = previous day.
export function today(): string {
  const now = new Date();
  const ilHour = parseInt(now.toLocaleString('en', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hour12: false }));
  if (ilHour < 4) {
    const yesterday = new Date(now.getTime() - 86400000);
    return yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  }
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}
