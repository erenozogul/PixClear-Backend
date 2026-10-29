import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { requireApiKey } from './middleware/apiKey.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { photosRouter } from './routes/photos.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : true }));
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', requireApiKey);
  app.use('/api/photos', photosRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
