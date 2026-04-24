// Haversine distance in meters
export function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} מ'`;
  return `${(meters / 1000).toFixed(1)} ק"מ`;
}

// Check if bus bearing roughly points toward target (within 90 degrees)
export function isMovingToward(busLat, busLon, busBearing, targetLat, targetLon) {
  if (busBearing == null) return true;
  const angleTo = (Math.atan2(targetLon - busLon, targetLat - busLat) * 180) / Math.PI;
  const normalized = ((angleTo % 360) + 360) % 360;
  let diff = Math.abs(normalized - busBearing);
  if (diff > 180) diff = 360 - diff;
  return diff < 90;
}
