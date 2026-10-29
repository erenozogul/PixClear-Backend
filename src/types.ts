/** Bir önizleme görselinden çıkarılan özellikler. */
export interface PhotoFeatures {
  id: string;
  /** 64 bit dHash, 16 haneli hex. */
  hash: string;
  /** Laplacian varyansı; büyük değer = daha keskin. */
  sharpness: number;
  /** 0..1, ortalama parlaklığın ortaya yakınlığı. */
  exposure: number;
  /** Parlaklık standart sapması (0..128). */
  contrast: number;
  /** Tamamen siyah veya beyaza patlamış piksel oranı (0..1). */
  clipped: number;
}

/** İstemcinin cihazdan bildirdiği bilgiler. */
export interface PhotoMeta {
  width?: number;
  height?: number;
  fileSize?: number;
  /** ISO tarih ya da epoch ms. */
  takenAt?: string | number;
  isFavorite?: boolean;
}

export type PhotoInput = PhotoFeatures & PhotoMeta;

export interface ScoredPhoto {
  id: string;
  score: number;
}

export interface PhotoGroup {
  keep: string;
  remove: string[];
  /** Gruptaki tüm fotoğraflar, en iyiden kötüye. */
  ranked: ScoredPhoto[];
  /** Silinecek fotoğrafların toplam boyutu (biliniyorsa). */
  reclaimableBytes: number;
}
