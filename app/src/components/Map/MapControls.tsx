import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface FitBoundsProps {
  coords: [number, number][];
  trigger: number;
}

export function FitBoundsOnChange({ coords, trigger }: FitBoundsProps) {
  const map = useMap();
  const lastTrigger = useRef<number | null>(null);
  useEffect(() => {
    if (!coords.length || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    const b = L.latLngBounds(coords);
    // Extra bottom padding to keep markers above the bottom sheet
    const bottomPad = Math.round(map.getSize().y * 0.4);
    if (b.isValid()) map.fitBounds(b, { paddingTopLeft: [50, 50], paddingBottomRight: [50, bottomPad], maxZoom: 15 });
  }, [coords, trigger, map]);
  return null;
}

interface FlyToProps {
  lat: number;
  lon: number;
  trigger: number;
}

export function FlyToLocation({ lat, lon, trigger }: FlyToProps) {
  const map = useMap();
  const lastTrigger = useRef<number | null>(null);
  useEffect(() => {
    if (!lat || !lon || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    // Offset center upward so the dot lands above the bottom sheet
    const offsetY = Math.round(map.getSize().y * 0.18);
    const targetPoint = map.project([lat, lon], 16).add([0, offsetY]);
    const targetLatLng = map.unproject(targetPoint, 16);
    map.flyTo(targetLatLng, 16, { duration: 0.8 });
  }, [lat, lon, trigger, map]);
  return null;
}

interface MapClickProps {
  onPin?: (lat: number, lon: number) => void;
  onMapTap?: () => void;
}

export function MapClickHandler({ onPin, onMapTap }: MapClickProps) {
  useMapEvents({
    click(e) {
      if (onPin) onPin(e.latlng.lat, e.latlng.lng);
      else if (onMapTap) onMapTap();
    },
  });
  return null;
}
