import { config } from './config.js';
import { createApp } from './app.js';

const server = createApp().listen(config.port, () => {
  console.log(`PixClear API ${config.port} portunda çalışıyor`);
});

// Cloud Run kapatırken SIGTERM gönderir; açık istekleri bitirip çık
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
