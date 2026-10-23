import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isInsideSupaul, SUPAUL_BOUNDS } from '../server/geo.js';

const localities = JSON.parse(fs.readFileSync(new URL('../src/data/supaul-localities.json', import.meta.url), 'utf8'));
const boundary = JSON.parse(fs.readFileSync(new URL('../src/data/supaul-boundary.json', import.meta.url), 'utf8'));
const landmarks = JSON.parse(fs.readFileSync(new URL('../src/data/supaul-landmarks.json', import.meta.url), 'utf8'));

describe('bundled Supaul local-vector map', () => {
  it('contains 12 unique, finite locality points inside the district polygon and bounded map extent', () => {
    assert.equal(boundary.geometry.type, 'Polygon');
    assert.ok(boundary.geometry.coordinates[0].length > 100);
    assert.equal(localities.length, 12);
    assert.equal(new Set(localities.map((place) => place.name)).size, 12);
    assert.equal(landmarks.length, 4);
    assert.ok(landmarks.some((place) => place.name === 'Supaul College of Engineering'));
    for (const place of [...localities, ...landmarks]) {
      assert.ok(Number.isFinite(place.latitude) && Number.isFinite(place.longitude), place.name);
      assert.ok(place.latitude >= SUPAUL_BOUNDS.south && place.latitude <= SUPAUL_BOUNDS.north, place.name);
      assert.ok(place.longitude >= SUPAUL_BOUNDS.west && place.longitude <= SUPAUL_BOUNDS.east, place.name);
      assert.equal(isInsideSupaul(place.latitude, place.longitude), true, place.name);
    }
  });
});
