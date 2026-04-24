export interface Stop {
  id: number;
  gtfs_stop_id: number;
  gtfs_stop__code: number | null;
  gtfs_stop__name: string | null;
  gtfs_stop__city: string | null;
  gtfs_stop__lat: number;
  gtfs_stop__lon: number;
  stop_sequence: number;
  arrival_time: string | null;
  shape_dist_traveled: number | null;
}

export interface Vehicle {
  siri_ride__vehicle_ref: string;
  siri_ride__scheduled_start_time: string | null;
  lat: number;
  lon: number;
  bearing: number | null;
  velocity: number | null;
  distance_from_journey_start: number;
  recorded_at_time: string;
  siri_route__line_ref: number;
  siri_route__operator_ref: number;
}

export interface TrackedLine {
  lineName: string;
  lineRefs: number[];
  agencyName: string;
  from: string;
  to: string;
  siblings: Sibling[] | null;
}

export interface Sibling {
  lineRef: number;
  from: string;
  to: string;
  direction: string;
  alternative: string;
}

export interface StopOffset {
  offsetMs: number;
  shapeDist: number | null;
}

export interface ScheduleData {
  stopOffsets: Map<number, StopOffset>;
  todayGtfsRouteId: number | null;
  referenceRideStart: number | null;
}

export interface UsageEntry {
  lineRef: number;
  lineName: string;
  agencyName: string;
  from: string;
  to: string;
  ts: number;
  day: number;
  hour: number;
  lat: number | null;
  lon: number | null;
}

export interface Suggestion {
  lineRef: number;
  lineName: string;
  agencyName: string;
  from: string;
  to: string;
  score: number;
  count: number;
  typicalHour: number;
}

export interface NearbyBus {
  siri_ride__vehicle_ref: string;
  siri_route__line_ref: number;
  lat: number;
  lon: number;
  dist: number;
  velocity: number | null;
  bearing: number | null;
  name: string;
  agency: string;
  from: string;
  to: string;
  etaMin: number | null;
}

export interface GtfsRoute {
  id: number;
  date: string;
  line_ref: number;
  operator_ref: number;
  route_short_name: string;
  route_long_name: string;
  route_mkt: string;
  route_direction: string;
  route_alternative: string;
  agency_name: string;
  route_type: string;
}

export interface GtfsRide {
  id: number;
  start_time: string | null;
  end_time: string | null;
  gtfs_route_id: number;
  gtfs_route__date: string;
  gtfs_route__route_short_name: string;
  gtfs_route__agency_name: string;
  gtfs_route__route_long_name: string;
}

export interface OperatorColor {
  bg: string;
  text: string;
}

export interface IsraelTime {
  str: string;
  minutes: number;
}

export interface Position {
  lat: number;
  lon: number;
}

export type AppView = 'home' | 'search' | 'tracking' | 'schedule';
export type SheetSnap = 'peek' | 'half' | 'full';
