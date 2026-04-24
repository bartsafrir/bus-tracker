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
    if (b.isValid()) map.fitBounds(b, { padding: [50, 50], maxZoom: 15 });
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
    map.flyTo([lat, lon], 16, { duration: 0.8 });
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
