import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { HttpError } from '../middleware/errors.js';
import { groupPhotos } from '../services/grouping.js';
import { MIME, optimizePhoto } from '../services/optimize.js';
import { analyzePhoto } from '../services/quality.js';

export const photosRouter = Router();

const thumbnailUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxThumbnailBytes, files: config.maxThumbnailsPerRequest },
});

const originalUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxOriginalBytes, files: 1 },
});

/**
 * POST /api/photos/analyze
 * multipart/form-data, alan adı "photos". Her dosyanın adı (filename) cihazdaki
 * fotoğraf kimliğidir. Yanıt: { results: PhotoFeatures[], failed: { id, error }[] }
 */
photosRouter.post('/analyze', thumbnailUpload.array('photos'), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new HttpError(400, '"photos" alanında en az bir görsel gönderin');

  const settled = await Promise.allSettled(files.map((f) => analyzePhoto(f.originalname, f.buffer)));

  const results = [];
  const failed = [];
  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    if (outcome.status === 'fulfilled') results.push(outcome.value);
    else failed.push({ id: files[i].originalname, error: 'Görsel okunamadı' });
  }
  res.json({ results, failed });
});

const groupsSchema = z.object({
  photos: z
    .array(
      z.object({
        id: z.string().min(1),
        hash: z.string().regex(/^[0-9a-f]{16}$/),
        sharpness: z.number().nonnegative(),
        exposure: z.number().min(0).max(1),
        contrast: z.number().nonnegative(),
        clipped: z.number().min(0).max(1),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        fileSize: z.number().int().nonnegative().optional(),
        takenAt: z.union([z.string(), z.number()]).optional(),
        isFavorite: z.boolean().optional(),
      }),
    )
    .max(20000),
  options: z
    .object({
      hashThreshold: z.number().int().min(0).max(32).optional(),
      maxTimeGapSeconds: z.number().min(0).optional(),
    })
    .optional(),
});

/**
 * POST /api/photos/groups
 * JSON: { photos: (PhotoFeatures & PhotoMeta)[], options? }
 * Yanıt: { groups: PhotoGroup[], summary }
 */
photosRouter.post('/groups', (req, res) => {
  const { photos, options } = groupsSchema.parse(req.body);
  const groups = groupPhotos(photos, options);
  res.json({
    groups,
    summary: {
      scanned: photos.length,
      groups: groups.length,
      removable: groups.reduce((acc, g) => acc + g.remove.length, 0),
      reclaimableBytes: groups.reduce((acc, g) => acc + g.reclaimableBytes, 0),
    },
  });
});

const optimizeQuery = z.object({
  maxDimension: z.coerce.number().int().min(256).max(12000).default(4096),
  quality: z.coerce.number().int().min(30).max(100).default(82),
  format: z.enum(['jpeg', 'webp', 'avif']).default('jpeg'),
  stripMetadata: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

/**
 * POST /api/photos/optimize?maxDimension=4096&quality=82&format=jpeg&stripMetadata=false
 * multipart/form-data, alan adı "photo". Yanıt gövdesi optimize edilmiş görseldir;
 * boyut bilgisi X-PixClear-* başlıklarında döner.
 */
photosRouter.post('/optimize', originalUpload.single('photo'), async (req, res) => {
  if (!req.file) throw new HttpError(400, '"photo" alanında bir görsel gönderin');
  const options = optimizeQuery.parse(req.query);

  const result = await optimizePhoto(req.file.buffer, options);

  res.set({
    'Content-Type': result.format === 'original' ? req.file.mimetype : MIME[result.format],
    'X-PixClear-Optimized': String(result.format !== 'original'),
    'X-PixClear-Original-Bytes': String(result.originalBytes),
    'X-PixClear-Optimized-Bytes': String(result.optimizedBytes),
    'X-PixClear-Width': String(result.width),
    'X-PixClear-Height': String(result.height),
    'Access-Control-Expose-Headers':
      'X-PixClear-Optimized, X-PixClear-Original-Bytes, X-PixClear-Optimized-Bytes, X-PixClear-Width, X-PixClear-Height',
  });
  res.send(result.buffer);
});
