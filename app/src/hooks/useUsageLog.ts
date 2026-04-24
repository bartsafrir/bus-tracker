import { useState, useMemo } from 'react';
import { distanceM } from '../utils/geo';
import type { UsageEntry, Suggestion, Position } from '../types';

export function useUsageLog(savedLoc: Position | null) {
  const [usageLog, setUsageLog] = useState<UsageEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('bt_usage') || '[]'); } catch { return []; }
  });

  function logUsage(line: { lineName: string; lineRef: number; agencyName: string; from: string; to: string }) {
    const now = new Date();
    const entry: UsageEntry = {
      lineRef: line.lineRef,
      lineName: line.lineName,
      agencyName: line.agencyName,
      from: line.from || '',
      to: line.to || '',
      ts: now.getTime(),
      day: now.getDay(),
      hour: now.getHours(),
      lat: savedLoc?.lat || null,
      lon: savedLoc?.lon || null,
    };
    setUsageLog(prev => {
      const next = [entry, ...prev].slice(0, 200);
      localStorage.setItem('bt_usage', JSON.stringify(next));
      return next;
    });
  }

  const suggestions = useMemo((): Suggestion[] => {
    if (!usageLog.length) return [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const nowMs = now.getTime();

    const scores = new Map<number, Suggestion>();
    for (const u of usageLog) {
      const daysAgo = (nowMs - u.ts) / 86400000;
      const recency = Math.exp(-daysAgo / 30);
      const hourDiff = Math.abs(currentHour - u.hour);
      const timeBoost = hourDiff <= 1 ? 2 : hourDiff <= 2 ? 1.3 : 1;
      const dayBoost = currentDay === u.day ? 1.5 : 1;
      let locBoost = 1;
      if (savedLoc && u.lat) {
        const dist = distanceM(savedLoc.lat, savedLoc.lon, u.lat, u.lon);
        locBoost = dist < 2000 ? 1.5 : 1;
      }
      const score = recency * timeBoost * dayBoost * locBoost;
      const existing = scores.get(u.lineRef);
      if (existing) {
        existing.score += score;
        existing.count++;
        if (u.ts > (existing as any).lastTs) {
          (existing as any).lastTs = u.ts;
          existing.from = u.from; existing.to = u.to;
        }
      } else {
        scores.set(u.lineRef, {
          lineRef: u.lineRef, lineName: u.lineName,
          agencyName: u.agencyName, from: u.from, to: u.to,
          score, count: 1, typicalHour: u.hour,
        } as any);
        (scores.get(u.lineRef) as any).lastTs = u.ts;
      }
    }

    // Find typical hour per line
    const hourCounts = new Map<string, number>();
    for (const u of usageLog) {
      const key = `${u.lineRef}_${u.hour}`;
      hourCounts.set(key, (hourCounts.get(key) || 0) + 1);
    }
    for (const [lineRef, entry] of scores) {
      let bestHour = 0, bestCount = 0;
      for (let h = 0; h < 24; h++) {
        const c = hourCounts.get(`${lineRef}_${h}`) || 0;
        if (c > bestCount) { bestCount = c; bestHour = h; }
      }
      entry.typicalHour = bestHour;
    }

    return [...scores.values()].sort((a, b) => b.score - a.score).slice(0, 6);
  }, [usageLog, savedLoc]);

  const recentLines = useMemo(() => {
    const seen = new Set<number>();
    return usageLog
      .filter(u => { if (seen.has(u.lineRef)) return false; seen.add(u.lineRef); return true; })
      .slice(0, 8)
      .map(u => ({ lineRef: u.lineRef, lineName: u.lineName, agencyName: u.agencyName, from: u.from, to: u.to }));
  }, [usageLog]);

  return { usageLog, logUsage, suggestions, recentLines };
}
