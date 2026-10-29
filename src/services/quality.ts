import sharp from 'sharp';
import type { PhotoFeatures } from '../types.js';
import { dHash } from './hash.js';

const ANALYSIS_SIZE = 512;

/**
 * Keskinlik, pozlama, kontrast ve patlamış piksel oranını ölçer.
 * Tüm ölçümler aynı boyuta indirilmiş gri görüntü üzerinde yapılır,
 * böylece farklı çözünürlükteki fotoğraflar adil karşılaştırılır.
 */
export async function measureQuality(input: Buffer) {
  const { data, info } = await sharp(input)
    .rotate()
    .grayscale()
    .resize(ANALYSIS_SIZE, ANALYSIS_SIZE, { fit: 'inside', withoutEnlargement: false })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const total = width * height;

  let sum = 0;
  let sumSq = 0;
  let clipped = 0;
  for (let i = 0; i < total; i++) {
    const v = data[i];
    sum += v;
    sumSq += v * v;
    if (v <= 3 || v >= 252) clipped++;
  }
  const mean = sum / total;
  const contrast = Math.sqrt(Math.max(0, sumSq / total - mean * mean));

  // 4-komşulu Laplacian; varyansı bulanıklıkta düşer
  let lapSum = 0;
  let lapSumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = data[i - width] + data[i + width] + data[i - 1] + data[i + 1] - 4 * data[i];
      lapSum += lap;
      lapSumSq += lap * lap;
      n++;
    }
  }
  const lapMean = n ? lapSum / n : 0;
  const sharpness = n ? lapSumSq / n - lapMean * lapMean : 0;

  return {
    sharpness: round(sharpness),
    exposure: round(1 - Math.abs(mean - 128) / 128),
    contrast: round(contrast),
    clipped: round(clipped / total),
  };
}

export async function analyzePhoto(id: string, input: Buffer): Promise<PhotoFeatures> {
  const [hash, quality] = await Promise.all([dHash(input), measureQuality(input)]);
  return { id, hash, ...quality };
}

const round = (v: number) => Math.round(v * 1000) / 1000;
