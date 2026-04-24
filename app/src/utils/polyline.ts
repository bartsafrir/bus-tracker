// Decode Valhalla encoded polyline (precision 6)
export function decodePolyline(str: string): [number, number][] {
  const coords: [number, number][] = [];
  let lat = 0, lon = 0, i = 0;
  while (i < str.length) {
    let b: number, shift = 0, result = 0;
    do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lon += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat / 1e6, lon / 1e6]);
  }
  return coords;
}

// Routing via Valhalla (real pedestrian + bus profiles)
export async function getRoute(
  coords: [number, number][],
  profile: 'foot' | 'bus' | 'auto' | string = 'auto'
): Promise<[number, number][] | null> {
  if (coords.length < 2) return null;
  const costing = profile === 'foot' ? 'pedestrian' : profile === 'bus' ? 'bus' : 'auto';
  const CHUNK = 18; // Valhalla public server limit is 20

  const chunks: [number, number][][] = [];
  for (let i = 0; i < coords.length; i += CHUNK - 1) {
    chunks.push(coords.slice(i, i + CHUNK));
    if (i + CHUNK >= coords.length) break;
  }

  const allCoords: [number, number][] = [];
  for (const chunk of chunks) {
    const locations = chunk.map(c => ({ lat: c[0], lon: c[1] }));
    const body = JSON.stringify({ locations, costing, directions_options: { units: 'km' } });
    try {
      const res = await fetch(`https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(body)}`);
      const data = await res.json();
      if (!data.trip?.legs?.length) continue;
      for (const leg of data.trip.legs) {
        if (leg.shape) {
          const pts = decodePolyline(leg.shape);
          allCoords.push(...(allCoords.length ? pts.slice(1) : pts));
        }
      }
    } catch { /* continue with next chunk */ }
  }
  return allCoords.length > 1 ? allCoords : null;
}
