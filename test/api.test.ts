import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import sharp from 'sharp';
import { createApp } from '../src/app.js';

let base = '';
let close: () => void;

before(async () => {
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
after(() => close());

const noisyImage = (seed: number, blur = 0) => {
  const width = 640;
  const height = 480;
  const pixels = Buffer.alloc(width * height * 3);
  let s = seed;
  for (let i = 0; i < pixels.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const x = Math.floor(i / 3) % width;
    // Sol-sağ dalgalı desen + gürültü: dHash yatay farklara bakar
    pixels[i] = Math.min(255, Math.round(100 + 80 * Math.sin(x / 40)) + (s % 40));
  }
  const img = sharp(pixels, { raw: { width, height, channels: 3 } });
  return (blur ? img.blur(blur) : img).jpeg({ quality: 95 }).toBuffer();
};

test('analyze → groups → optimize akışı', async () => {
  const sharpImg = await noisyImage(1);
  const blurry = await noisyImage(1, 4);

  const form = new FormData();
  form.append('photos', new Blob([sharpImg], { type: 'image/jpeg' }), 'sharp');
  form.append('photos', new Blob([blurry], { type: 'image/jpeg' }), 'blurry');
  const analyzed = await fetch(`${base}/api/photos/analyze`, { method: 'POST', body: form }).then((r) => r.json());
  assert.equal(analyzed.results.length, 2);

  const grouped = await fetch(`${base}/api/photos/groups`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ photos: analyzed.results }),
  }).then((r) => r.json());
  assert.equal(grouped.groups.length, 1);
  assert.equal(grouped.groups[0].keep, 'sharp');

  const optForm = new FormData();
  optForm.append('photo', new Blob([sharpImg], { type: 'image/jpeg' }), 'sharp.jpg');
  const optimized = await fetch(`${base}/api/photos/optimize?quality=70`, { method: 'POST', body: optForm });
  assert.equal(optimized.status, 200);
  const bytes = Number(optimized.headers.get('x-pixclear-optimized-bytes'));
  assert.ok(bytes < sharpImg.length);
});

test('geçersiz gövde 400 döner', async () => {
  const res = await fetch(`${base}/api/photos/groups`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ photos: [{ id: 'a' }] }),
  });
  assert.equal(res.status, 400);
});
