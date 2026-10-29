import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { dHash, hammingDistance } from '../src/services/hash.js';

const gradient = async (width: number, height: number, invert = false) => {
  const pixels = Buffer.alloc(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = Math.round((x / (width - 1)) * 255);
      pixels[y * width + x] = invert ? 255 - v : v;
    }
  return sharp(pixels, { raw: { width, height, channels: 1 } }).jpeg().toBuffer();
};

test('aynı görselin farklı boyutları neredeyse aynı hash üretir', async () => {
  const big = await dHash(await gradient(800, 600));
  const small = await dHash(await gradient(200, 150));
  assert.ok(hammingDistance(big, small) <= 3);
});

test('ters görsel çok farklı hash üretir', async () => {
  const a = await dHash(await gradient(400, 300));
  const b = await dHash(await gradient(400, 300, true));
  assert.ok(hammingDistance(a, b) > 32);
});

test('hammingDistance bit farkını sayar', () => {
  assert.equal(hammingDistance('0000000000000000', '000000000000000f'), 4);
  assert.equal(hammingDistance('ffffffffffffffff', 'ffffffffffffffff'), 0);
});
