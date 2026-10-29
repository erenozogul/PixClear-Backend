import sharp from 'sharp';

const POPCOUNT_NIBBLE = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

/**
 * Fark hash'i (dHash): görüntü 9x8 gri tonlamaya indirilir, her satırda
 * yan yana pikseller karşılaştırılır. Yeniden boyutlandırma, sıkıştırma ve
 * küçük ışık farklarına dayanıklıdır; benzer kareler birkaç bit farkla eşleşir.
 */
export async function dHash(input: Buffer): Promise<string> {
  const { data } = await sharp(input)
    .rotate()
    .grayscale()
    .resize(9, 8, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hex = '';
  for (let row = 0; row < 8; row++) {
    let byte = 0;
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
      byte = (byte << 1) | (left > right ? 1 : 0);
    }
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

/** İki hex hash arasındaki farklı bit sayısı. */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) throw new Error('Hash uzunlukları farklı');
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    distance += POPCOUNT_NIBBLE[parseInt(a[i], 16) ^ parseInt(b[i], 16)];
  }
  return distance;
}
