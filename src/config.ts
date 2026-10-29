const list = (value: string | undefined) =>
  (value ?? '')
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);

export const config = {
  port: Number(process.env.PORT ?? 8080),
  corsOrigins: list(process.env.CORS_ORIGINS),
  apiKey: process.env.API_KEY || undefined,

  // Analiz için gönderilen küçük önizlemeler (istemci ~512px'e küçültür)
  maxThumbnailBytes: 5 * 1024 * 1024,
  maxThumbnailsPerRequest: 100,

  // Cloud Run HTTP/1 istek gövdesi sınırı 32 MiB; payı bırakıyoruz
  maxOriginalBytes: 30 * 1024 * 1024,

  // Gruplama varsayılanları
  defaultHashThreshold: 10, // 64 bitten en fazla kaç bit farklı olabilir
  defaultMaxTimeGapSeconds: 120, // benzer ama zamanca uzak fotoğraflar ayrı tutulur
  exactDuplicateThreshold: 3, // bu kadar yakınsa zamana bakılmaz (tekrar indirilen kopyalar)
};
