import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { FitBoundsOnChange, FlyToLocation, MapClickHandler } from './Map/MapControls';
import L from 'leaflet';
import type { Position } from '../types';

// ─── Leaflet icons ───
const meIcon = L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });
const stopIconSm = L.divIcon({ className: '', html: '<div class="stop-dot"></div>', iconSize: [10, 10], iconAnchor: [5, 5] });
const closestStopIcon = L.divIcon({ className: '', html: '<div class="stop-dot closest"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
const selectedStopIcon = L.divIcon({ className: '', html: '<div class="stop-dot selected"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

function makeBusIcon(bearing: number | null, color: string, lineNum: string) {
  const r = bearing ?? 0;
  const arrow = `<svg viewBox="0 0 24 24" style="transform:rotate(${r}deg)"><path d="M12 2L4 20h3l5-6 5 6h3L12 2z"/></svg>`;
  return L.divIcon({
    className: '',
    html: `<div class="bus-chip" style="--c:${color}">
      <div class="bus-chip-body">
        <span class="bus-chip-num">${lineNum || ''}</span>
        <span class="bus-chip-dir">${arrow}</span>
      </div>
    </div>`,
    iconSize: [56, 56], iconAnchor: [28, 28],
  });
}

interface MapViewProps {
  theme: 'dark' | 'light';
  view: string;
  savedLoc: Position | null;
  devMode: boolean;
  pinMode: boolean;
  fitCoords: [number, number][];
  fitTrigger: number;
  flyToTrigger: number;
  routeCoords: [number, number][];
  opColor: string;
  stops: any[];
  closestStop: any;
  selectedStop: any;
  vehicles: any[];
  tracked: any;
  walkRoute: [number, number][] | null;
  onPin: (lat: number, lon: number) => void;
  onMapTap: () => void;
  onStopClick: (stop: any) => void;
  onDragEnd: (lat: number, lon: number) => void;
}

export default function MapView({
  theme, view, savedLoc, devMode, pinMode,
  fitCoords, fitTrigger, flyToTrigger,
  routeCoords, opColor, stops, closestStop, selectedStop,
  vehicles, tracked, walkRoute,
  onPin, onMapTap, onStopClick, onDragEnd,
}: MapViewProps) {
  return (
    <MapContainer center={[31.77, 35.21]} zoom={8} zoomControl={false} className="the-map">
      <TileLayer
        key={theme}
        url={theme === 'dark'
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'}
        maxZoom={20} subdomains="abcd"
      />
      <FitBoundsOnChange coords={fitCoords} trigger={fitTrigger} />
      {flyToTrigger > 0 && savedLoc && <FlyToLocation lat={savedLoc.lat} lon={savedLoc.lon} trigger={flyToTrigger} />}
      {pinMode ? (
        <MapClickHandler onPin={onPin} />
      ) : (
        <MapClickHandler onMapTap={onMapTap} />
      )}

      {routeCoords.length > 1 && <Polyline positions={routeCoords} pathOptions={{ color: opColor, weight: 5, opacity: 0.5, lineCap: 'round', lineJoin: 'round' }} />}

      {stops.map(s => (
        <Marker key={s.id} position={[s.gtfs_stop__lat, s.gtfs_stop__lon]}
          icon={selectedStop?.id === s.id ? selectedStopIcon : closestStop?.id === s.id ? closestStopIcon : stopIconSm}
          eventHandlers={{ click: () => onStopClick(s) }} />
      ))}

      {vehicles.map(v => (
        <Marker key={v.siri_ride__vehicle_ref} position={[v.lat, v.lon]} icon={makeBusIcon(v.bearing, opColor, tracked?.lineName)}>
          <Popup closeButton={false} className="bus-popup">
            {(() => {
              const mins = v.recorded_at_time ? Math.max(0, Math.round((Date.now() - new Date(v.recorded_at_time).getTime()) / 60000)) : null;
              const plateRaw = v.siri_ride__vehicle_ref || '';
              const plate = plateRaw.length === 8
                ? `${plateRaw.slice(0,3)}-${plateRaw.slice(3,5)}-${plateRaw.slice(5)}`
                : plateRaw.length === 7
                  ? `${plateRaw.slice(0,2)}-${plateRaw.slice(2,5)}-${plateRaw.slice(5)}`
                  : plateRaw;
              return (
                <div className="bus-popup-inner">
                  <div className="bus-popup-header">
                    <span className="bus-popup-badge" style={{ background: opColor }}>{tracked?.lineName}</span>
                    <div className="bus-plate">
                      <div className="bus-plate-band"></div>
                      <span className="bus-plate-num">{plate}</span>
                    </div>
                  </div>
                  <div className="bus-popup-stats">
                    {v.velocity != null && <span className="bus-popup-stat">{v.velocity} קמ"ש</span>}
                    {v.bearing != null && <span className="bus-popup-stat">{v.bearing}°</span>}
                  </div>
                  {mins != null && (
                    <div className="bus-popup-time">
                      {mins === 0 ? 'עכשיו' : mins === 1 ? 'לפני דקה' : `לפני ${mins} דק'`}
                    </div>
                  )}
                </div>
              );
            })()}
          </Popup>
        </Marker>
      ))}

      {/* Walking route to nearest stop */}
      {view === 'tracking' && walkRoute && (
        <Polyline
          positions={walkRoute}
          pathOptions={{ color: '#5B8DEF', weight: 3, opacity: 0.7, dashArray: '4,8', lineCap: 'round' }}
        />
      )}
      {view === 'tracking' && !walkRoute && savedLoc && closestStop && (
        <Polyline
          positions={[[savedLoc.lat, savedLoc.lon], [closestStop.gtfs_stop__lat, closestStop.gtfs_stop__lon]]}
          pathOptions={{ color: '#5B8DEF', weight: 3, opacity: 0.4, dashArray: '6,8', lineCap: 'round' }}
        />
      )}

      {savedLoc && (
        <Marker
          position={[savedLoc.lat, savedLoc.lon]}
          icon={meIcon}
          draggable={devMode}
          eventHandlers={devMode ? {
            dragend: (e) => {
              const ll = e.target.getLatLng();
              onDragEnd(ll.lat, ll.lng);
            }
          } : {}}
        />
      )}
    </MapContainer>
  );
}
