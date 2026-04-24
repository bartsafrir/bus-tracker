// Parse "כרמלית-תל אביב יפו<->ת. מרכזית רחובות/רציפים-רחובות-1#"
export function parseRouteName(longName) {
  const cleaned = longName.replace(/-\d+[#0-9א-ת]*$/, '');
  const [from, to] = cleaned.split('<->').map(s => s.trim());
  return { from: from || cleaned, to: to || '' };
}

// Extract city names from route_long_name
export function extractCities(longName) {
  const cleaned = longName.replace(/-\d+[#0-9א-ת]*$/, '');
  const parts = cleaned.split('<->');
  if (parts.length !== 2) return { fromCity: '', toCity: '' };
  const extractCity = s => {
    const m = s.match(/-([^-<>]+)$/);
    return m ? m[1].trim() : s.trim();
  };
  return { fromCity: extractCity(parts[0]), toCity: extractCity(parts[1]) };
}

// Deduplicate routes by line_ref, keeping first occurrence
export function dedupeRoutes(routes, dateFilter = null) {
  const unique = [];
  const seen = new Set();
  for (const r of routes) {
    if (dateFilter && r.date !== dateFilter) continue;
    if (!seen.has(r.line_ref)) {
      seen.add(r.line_ref);
      unique.push(r);
    }
  }
  return unique;
}

// Group routes by agency_name
export function groupByOperator(routes) {
  const map = new Map();
  for (const r of routes) {
    if (!map.has(r.agency_name)) map.set(r.agency_name, []);
    map.get(r.agency_name).push(r);
  }
  return map;
}

// Latest location per vehicle from a list of location records
export function latestPerVehicle(locations) {
  const byV = new Map();
  for (const loc of locations) {
    const v = loc.siri_ride__vehicle_ref;
    if (!v) continue;
    const prev = byV.get(v);
    if (!prev || new Date(loc.recorded_at_time) > new Date(prev.recorded_at_time)) {
      byV.set(v, loc);
    }
  }
  return Array.from(byV.values());
}
