import { distanceM } from './geo';

// Post-process OSRM route: remove loops, but keep loops that serve stops.
export function removeLoops(path: [number, number][], stopCoords: [number, number][]): [number, number][] {
  if (path.length < 10 || !stopCoords?.length) return path;
  const GRID = 0.0003; // ~30m
  const cellKey = (lat: number, lon: number) => `${Math.round(lat / GRID)},${Math.round(lon / GRID)}`;

  const result: [number, number][] = [];
  let i = 0;
  while (i < path.length) {
    result.push(path[i]);
    const key = cellKey(path[i][0], path[i][1]);
    let jumpTo = -1;

    for (let j = i + 10; j < Math.min(i + 150, path.length); j++) {
      if (cellKey(path[j][0], path[j][1]) === key) jumpTo = j;
    }

    if (jumpTo > 0) {
      const loopSegment = path.slice(i, jumpTo + 1);
      let stopNeedsLoop = false;

      for (const stop of stopCoords) {
        let minLoopDist = Infinity;
        for (const p of loopSegment) {
          const d = distanceM(stop[0], stop[1], p[0], p[1]);
          if (d < minLoopDist) minLoopDist = d;
        }
        const junctionDist = distanceM(stop[0], stop[1], path[jumpTo][0], path[jumpTo][1]);
        if (minLoopDist < 40 && junctionDist > 80) {
          stopNeedsLoop = true;
          break;
        }
      }

      if (stopNeedsLoop) {
        i++;
      } else {
        i = jumpTo + 1;
      }
    } else {
      i++;
    }
  }
  return result.length > 1 ? result : path;
}
