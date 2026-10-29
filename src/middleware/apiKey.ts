import type { RequestHandler } from 'express';
import { config } from '../config.js';

/** API_KEY tanımlıysa "x-api-key" başlığını zorunlu kılar. */
export const requireApiKey: RequestHandler = (req, res, next) => {
  if (!config.apiKey || req.get('x-api-key') === config.apiKey) {
    next();
    return;
  }
  res.status(401).json({ error: 'Yetkisiz' });
};
