import { useState, useCallback } from 'react';

export function useUserLocation(savedLocation, onSave) {
  const [position, setPosition] = useState(savedLocation);
  const [loading, setLoading] = useState(false);

  const locateGPS = useCallback(() => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setPosition(loc);
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          setLoading(false);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  }, []);

  const setManual = useCallback((lat, lon) => {
    const loc = { lat, lon };
    setPosition(loc);
    onSave?.(lat, lon);
  }, [onSave]);

  return { position, loading, locateGPS, setManual };
}
