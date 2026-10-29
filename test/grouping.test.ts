import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupPhotos } from '../src/services/grouping.js';
import type { PhotoInput } from '../src/types.js';

const photo = (id: string, hash: string, extra: Partial<PhotoInput> = {}): PhotoInput => ({
  id,
  hash,
  sharpness: 100,
  exposure: 0.8,
  contrast: 50,
  clipped: 0,
  width: 4000,
  height: 3000,
  fileSize: 3_000_000,
  takenAt: '2026-10-01T10:00:00Z',
  ...extra,
});

test('benzer fotoğrafları gruplar, en keskin olanı tutar', () => {
  const groups = groupPhotos([
    photo('a', 'ff00ff00ff00ff00', { sharpness: 40 }),
    photo('b', 'ff00ff00ff00ff01', { sharpness: 300 }),
    photo('c', 'ff00ff00ff00ff03', { sharpness: 120 }),
    photo('x', '0f0f0f0f0f0f0f0f'),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].keep, 'b');
  assert.deepEqual(groups[0].remove.sort(), ['a', 'c']);
  assert.equal(groups[0].reclaimableBytes, 6_000_000);
});

test('favori fotoğraf her zaman tutulur', () => {
  const [group] = groupPhotos([
    photo('sharp', 'ff00ff00ff00ff00', { sharpness: 500 }),
    photo('fav', 'ff00ff00ff00ff01', { sharpness: 10, isFavorite: true }),
  ]);
  assert.equal(group.keep, 'fav');
});

test('benzer ama saatlerce arayla çekilmiş fotoğraflar ayrı kalır', () => {
  const groups = groupPhotos([
    photo('morning', 'ff00ff00ff00ff00', { takenAt: '2026-10-01T08:00:00Z' }),
    photo('evening', 'ff00ff00ff00ff3f', { takenAt: '2026-10-01T20:00:00Z' }),
  ]);
  assert.equal(groups.length, 0);
});

test('birebir kopyalar zamandan bağımsız gruplanır', () => {
  const groups = groupPhotos([
    photo('orig', 'ff00ff00ff00ff00', { takenAt: '2025-01-01T00:00:00Z' }),
    photo('copy', 'ff00ff00ff00ff00', { takenAt: '2026-06-01T00:00:00Z', width: 1280, height: 960 }),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].keep, 'orig');
});
