import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { latestPerVehicle } from '../utils/routes';
import { distanceM } from '../utils/geo';
import { today } from '../utils/time';
import type { Suggestion, Position } from '../types';

export function useSuggestionsLive(suggestions: Suggestion[], savedLoc: Position | null) {
  const [suggestionsLive, setSuggestionsLive] = useState<Record<number, any>>({});

  useEffect(() => {
    if (!suggestions.length || !savedLoc) return;
    let cancelled = false;

    async function loadSuggestionsLive() {
      const data = {};
      await Promise.allSettled(suggestions.slice(0, 4).map(async s => {
        try {
          // Get live vehicles for this line
          const now = new Date();
          const from = new Date(now.getTime() - 5 * 60000);
          const locs = await apiFetch('/siri_vehicle_locations/list', {
            siri_routes__line_ref: s.lineRef,
            recorded_at_time_from: from.toISOString(),
            recorded_at_time_to: now.toISOString(),
            limit: 20,
          });
          const vehicles = latestPerVehicle(locs);

          // Get stops to find nearest stop to user
          const todayRoutes = await apiFetch('/gtfs_routes/list', { line_refs: s.lineRef, date: today(), limit: 1, order_by: 'date desc' });
          const routeId = todayRoutes[0]?.id;
          if (!routeId) return;
          const rides = await apiFetch('/gtfs_rides/list', { gtfs_route_id: routeId, limit: 1 });
          if (!rides.length) return;
          const rideStops = await apiFetch('/gtfs_ride_stops/list', { gtfs_ride_ids: rides[0].id, limit: 200 });
          const validStops = rideStops.filter(st => st.gtfs_stop__lat && st.gtfs_stop__lon).sort((a, b) => a.stop_sequence - b.stop_sequence);
          if (!validStops.length) return;

          // Find nearest stop to user
          let minD = Infinity, nearestStop: any = null;
          for (const st of validStops) {
            const d = distanceM(savedLoc!.lat, savedLoc!.lon, st.gtfs_stop__lat, st.gtfs_stop__lon);
            if (d < minD) { minD = d; nearestStop = st; }
          }

          // Find nearest vehicle approaching (simple: closest by straight line)
          let bestEta: number | null = null;
          if (vehicles.length && nearestStop) {
            const stopIdx = validStops.findIndex(st => st.id === nearestStop.id);
            for (const v of vehicles) {
              let busMinD = Infinity, busIdx = -1;
              for (let i = 0; i < validStops.length; i++) {
                const d = distanceM(v.lat, v.lon, validStops[i].gtfs_stop__lat, validStops[i].gtfs_stop__lon);
                if (d < busMinD) { busMinD = d; busIdx = i; }
              }
              if (busIdx >= 0 && busIdx < stopIdx && rides[0].start_time) {
                const refStart = new Date(rides[0].start_time).getTime();
                const busOff = validStops[busIdx].arrival_time ? new Date(validStops[busIdx].arrival_time).getTime() - refStart : 0;
                const stopOff = nearestStop.arrival_time ? new Date(nearestStop.arrival_time).getTime() - refStart : 0;
                const eta = Math.round((stopOff - busOff) / 60000);
                if (eta > 0 && eta < 60 && (!bestEta || eta < bestEta)) bestEta = eta;
              }
            }
          }

          if (!cancelled) {
            data[s.lineRef] = {
              liveCount: vehicles.length,
              stopName: nearestStop?.gtfs_stop__name || null,
              stopCode: nearestStop?.gtfs_stop__code || null,
              eta: bestEta,
            };
          }
        } catch (e) { /* non-critical */ }
      }));
      if (!cancelled) setSuggestionsLive(data);
    }

    loadSuggestionsLive();
    const iv = setInterval(loadSuggestionsLive, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [suggestions, savedLoc]);

  return { suggestionsLive };
}
