import sharp from 'sharp';

export type OutputFormat = 'jpeg' | 'webp' | 'avif';

export interface OptimizeOptions {
  maxDimension: number;
  quality: number;
  format: OutputFormat;
  /** true: EXIF (tarih, konum vb.) silinir. false: korunur. */
  stripMetadata: boolean;
}

export interface OptimizeResult {
  buffer: Buffer;
  format: OutputFormat | 'original';
  originalBytes: number;
  optimizedBytes: number;
  width: number;
  height: number;
}

/**
 * Fotoğrafı yönüne göre döndürür, gerekirse küçültür ve yeniden sıkıştırır.
 * Sonuç orijinalden büyük çıkarsa orijinal olduğu gibi döner.
 */
export async function optimizePhoto(input: Buffer, options: OptimizeOptions): Promise<OptimizeResult> {
  let pipeline = sharp(input, { failOn: 'none' })
    .rotate()
    .resize(options.maxDimension, options.maxDimension, { fit: 'inside', withoutEnlargement: true });

  if (!options.stripMetadata) pipeline = pipeline.keepExif().keepIccProfile();

  switch (options.format) {
    case 'webp':
      pipeline = pipeline.webp({ quality: options.quality, effort: 5 });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality: options.quality, effort: 4 });
      break;
    default:
      pipeline = pipeline.jpeg({ quality: options.quality, mozjpeg: true, progressive: true });
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  if (data.length >= input.length) {
    const meta = await sharp(input).metadata();
    return {
      buffer: input,
      format: 'original',
      originalBytes: input.length,
      optimizedBytes: input.length,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    };
  }

  return {
    buffer: data,
    format: options.format,
    originalBytes: input.length,
    optimizedBytes: data.length,
    width: info.width,
    height: info.height,
  };
}

export const MIME: Record<OutputFormat, string> = {
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
};
