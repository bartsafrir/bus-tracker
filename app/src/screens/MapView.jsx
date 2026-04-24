import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AppContext } from '../App';
import { getVehicleLocations, getRideStops, getRouteRides, apiFetch, todayStr } from '../api/stride';
import { latestPerVehicle } from '../utils/routes';
import { toIsraelTime, israelNow, formatCountdown } from '../utils/time';
import { distanceM } from '../utils/geo';
import StopSchedule from '../components/StopSchedule';
import 'leaflet/dist/leaflet.css';

function busIcon(bearing) {
  const r = bearing ?? 0;
  return L.divIcon({
    className: '',
    html: `<div class="bus-marker" style="transform:rotate(${r}deg)"><div class="arrow"></div><div class="dot"></div></div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16],
  });
}

const stopIcon = L.divIcon({ className: '', html: '<div class="stop-dot"></div>', iconSize: [10, 10], iconAnchor: [5, 5] });
const closestIcon = L.divIcon({ className: '', html: '<div class="stop-dot closest"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
const meIcon = L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [bounds, map]);
  return null;
}

export default function MapView() {
  const { activeTracking, userLocation } = useContext(AppContext);
  const [vehicles, setVehicles] = useState([]);
  const [stops, setStops] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);
  const [closestStop, setClosestStop] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [scheduleData, setScheduleData] = useState(null); // { stopOffsets, todayGtfsRouteId, referenceRideStart }
  const intervalRef = useRef(null);

  const lineName = activeTracking?.lineName || '';
  const lineRefs = activeTracking?.lineRefs || [];

  // Load route path + stops
  useEffect(() => {
    if (!lineRefs.length) return;
    let cancelled = false;

    async function load() {
      try {
        // Find today's gtfs_route_id
        const todayRoutes = await apiFetch('/gtfs_routes/list', {
          line_refs: lineRefs[0], date: todayStr(), limit: 1, order_by: 'date desc',
        });
        const todayRouteId = todayRoutes[0]?.id || null;

        const rideParams = todayRouteId
          ? { gtfs_route_id: todayRouteId, limit: 1 }
          : { gtfs_route__line_refs: lineRefs[0], limit: 1 };
        const rides = await apiFetch('/gtfs_rides/list', rideParams);
        if (cancelled || !rides.length) return;

        const rideStops = await getRideStops(rides[0].id);
        if (cancelled) return;

        const sorted = rideStops.filter(s => s.gtfs_stop__lat && s.gtfs_stop__lon).sort((a, b) => a.stop_sequence - b.stop_sequence);
        setStops(sorted);
        setRouteCoords(sorted.map(s => [s.gtfs_stop__lat, s.gtfs_stop__lon]));

        // Compute stop offsets for schedule
        const refStart = rides[0].start_time ? new Date(rides[0].start_time).getTime() : null;
        const offsets = new Map();
        for (const s of sorted) {
          if (s.arrival_time && s.gtfs_stop_id && refStart) {
            offsets.set(s.gtfs_stop_id, {
              offsetMs: new Date(s.arrival_time).getTime() - refStart,
              shapeDist: s.shape_dist_traveled,
            });
          }
        }
        setScheduleData({ stopOffsets: offsets, todayGtfsRouteId: todayRouteId, referenceRideStart: refStart });

        // Find closest stop
        if (userLocation) {
          let minD = Infinity, closest = null;
          for (const s of sorted) {
            const d = distanceM(userLocation.lat, userLocation.lon, s.gtfs_stop__lat, s.gtfs_stop__lon);
            if (d < minD) { minD = d; closest = s; }
          }
          setClosestStop(closest);
        }
      } catch (e) { console.error('Load route:', e); }
    }
    load();
    return () => { cancelled = true; };
  }, [lineRefs, userLocation]);

  // Poll vehicle locations
  const fetchVehicles = useCallback(async () => {
    if (!lineRefs.length) return;
    try {
      const results = await Promise.allSettled(lineRefs.map(lr => getVehicleLocations(lr)));
      const allLocs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      setVehicles(latestPerVehicle(allLocs));
    } catch (e) { console.error('Vehicles:', e); }
  }, [lineRefs]);

  useEffect(() => {
    fetchVehicles();
    intervalRef.current = setInterval(fetchVehicles, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchVehicles]);

  // Compute bounds
  const bounds = L.latLngBounds();
  routeCoords.forEach(c => bounds.extend(c));
  vehicles.forEach(v => bounds.extend([v.lat, v.lon]));
  if (userLocation) bounds.extend([userLocation.lat, userLocation.lon]);

  if (!lineRefs.length) {
    return (
      <div className="screen">
        <div className="empty-state">
          <div className="emoji">🗺️</div>
          <p>חפש קו כדי לעקוב אחריו על המפה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="header">
        <h1>קו {lineName}</h1>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 13, opacity: 0.8 }}>{vehicles.length} אוטובוסים</span>
      </div>

      <div className="map-container">
        <MapContainer center={[31.77, 35.21]} zoom={8} zoomControl={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
            maxZoom={20}
            subdomains="abcd"
          />
          <FitBounds bounds={bounds.isValid() ? bounds : null} />

          {routeCoords.length > 1 && (
            <Polyline positions={routeCoords} color="#1a73e8" weight={4} opacity={0.5} dashArray="8, 8" />
          )}

          {stops.map(s => (
            <Marker
              key={s.id}
              position={[s.gtfs_stop__lat, s.gtfs_stop__lon]}
              icon={closestStop?.id === s.id ? closestIcon : stopIcon}
              eventHandlers={{ click: () => setSelectedStop(s) }}
            />
          ))}

          {vehicles.map(v => (
            <Marker key={v.siri_ride__vehicle_ref} position={[v.lat, v.lon]} icon={busIcon(v.bearing)}>
              <Popup closeButton={false}>
                <div style={{ direction: 'rtl', fontSize: 13, lineHeight: 1.6 }}>
                  <b>קו {lineName}</b><br />
                  רכב: {v.siri_ride__vehicle_ref}<br />
                  מהירות: {v.velocity != null ? `${v.velocity} קמ"ש` : '—'}
                </div>
              </Popup>
            </Marker>
          ))}

          {userLocation && <Marker position={[userLocation.lat, userLocation.lon]} icon={meIcon} />}
        </MapContainer>

        {closestStop && !selectedStop && (
          <div className="map-info" onClick={() => setSelectedStop(closestStop)}>
            <div className="map-info-stop">
              {closestStop.gtfs_stop__name}
              {closestStop.gtfs_stop__city && `, ${closestStop.gtfs_stop__city}`}
            </div>
            <div className="map-info-schedule">לחץ לצפייה בלוח זמנים</div>
          </div>
        )}
      </div>

      {selectedStop && scheduleData && (
        <StopSchedule
          stop={selectedStop}
          lineName={lineName}
          lineRefs={lineRefs}
          scheduleData={scheduleData}
          vehicles={vehicles}
          onClose={() => setSelectedStop(null)}
        />
      )}
    </div>
  );
}
