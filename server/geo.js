import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const feature = JSON.parse(fs.readFileSync(path.join(config.root, 'src/data/supaul-boundary.json'), 'utf8'));
const ring = feature.geometry.coordinates[0];

export const SUPAUL_BOUNDS = {
  south: 25.9907976,
  west: 86.4048044,
  north: 26.5628535,
  east: 87.1202519,
};

// Ray-casting point-in-polygon check. Coordinates are [longitude, latitude].
export function isInsideSupaul(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < SUPAUL_BOUNDS.south || latitude > SUPAUL_BOUNDS.north || longitude < SUPAUL_BOUNDS.west || longitude > SUPAUL_BOUNDS.east) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = ((yi > latitude) !== (yj > latitude)) &&
      (longitude < ((xj - xi) * (latitude - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}
