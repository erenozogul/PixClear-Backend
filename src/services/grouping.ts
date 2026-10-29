import { config } from '../config.js';
import type { PhotoGroup, PhotoInput, ScoredPhoto } from '../types.js';
import { hammingDistance } from './hash.js';

export interface GroupingOptions {
  hashThreshold?: number;
  maxTimeGapSeconds?: number;
}

/**
 * Benzer fotoğrafları gruplar ve her grupta en iyisini seçer.
 * Tek başına kalan fotoğraflar sonuçta yer almaz.
 */
export function groupPhotos(photos: PhotoInput[], options: GroupingOptions = {}): PhotoGroup[] {
  const threshold = options.hashThreshold ?? config.defaultHashThreshold;
  const maxGapMs = (options.maxTimeGapSeconds ?? config.defaultMaxTimeGapSeconds) * 1000;

  const parent = photos.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const times = photos.map((p) => toMillis(p.takenAt));

  for (let i = 0; i < photos.length; i++) {
    for (let j = i + 1; j < photos.length; j++) {
      const distance = hammingDistance(photos[i].hash, photos[j].hash);
      if (distance > threshold) continue;
      if (distance > config.exactDuplicateThreshold && maxGapMs > 0) {
        const ti = times[i];
        const tj = times[j];
        if (ti !== undefined && tj !== undefined && Math.abs(ti - tj) > maxGapMs) continue;
      }
      union(i, j);
    }
  }

  const clusters = new Map<number, PhotoInput[]>();
  photos.forEach((photo, i) => {
    const root = find(i);
    const members = clusters.get(root) ?? [];
    members.push(photo);
    clusters.set(root, members);
  });

  const groups: PhotoGroup[] = [];
  for (const members of clusters.values()) {
    if (members.length < 2) continue;
    const ranked = rankGroup(members);
    const [best, ...rest] = ranked;
    const removeIds = rest.map((r) => r.id);
    const sizes = new Map(members.map((m) => [m.id, m.fileSize ?? 0]));
    groups.push({
      keep: best.id,
      remove: removeIds,
      ranked,
      reclaimableBytes: removeIds.reduce((acc, id) => acc + (sizes.get(id) ?? 0), 0),
    });
  }

  return groups.sort((a, b) => b.reclaimableBytes - a.reclaimableBytes || b.remove.length - a.remove.length);
}

/**
 * Grup içindeki fotoğrafları puanlar. Keskinlik ve kontrast grup içindeki
 * en yüksek değere göre normalize edilir; favoriler her zaman öne geçer.
 */
export function rankGroup(members: PhotoInput[]): ScoredPhoto[] {
  const maxSharpness = Math.max(...members.map((m) => m.sharpness), 1e-9);
  const maxContrast = Math.max(...members.map((m) => m.contrast), 1e-9);
  const pixels = members.map((m) => (m.width ?? 0) * (m.height ?? 0));
  const maxPixels = Math.max(...pixels, 1);

  const scored = members.map((m, i) => {
    const score =
      0.45 * (m.sharpness / maxSharpness) +
      0.2 * m.exposure +
      0.1 * (m.contrast / maxContrast) +
      0.15 * (pixels[i] / maxPixels) +
      0.1 * (1 - m.clipped) +
      (m.isFavorite ? 1 : 0);
    return { id: m.id, score: Math.round(score * 1000) / 1000 };
  });

  return scored.sort((a, b) => b.score - a.score);
}

function toMillis(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}
