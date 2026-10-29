# PixClear Backend

Telefon galerisindeki fotoğrafları analiz eden, aynı/benzer kareleri gruplayıp her grubun en iyisini seçen ve fotoğrafları optimize eden API. Mobil uygulama: [PixClear-Frontend](https://github.com/erenozogul/PixClear-Frontend).

## Nasıl çalışır

1. **Analiz** – Uygulama her fotoğrafın ~512px önizlemesini gönderir. Sunucu her biri için:
   - `dHash` (64 bit algısal hash) – boyut, sıkıştırma ve küçük ışık farklarına dayanıklı,
   - keskinlik (Laplacian varyansı), pozlama, kontrast ve patlamış piksel oranı hesaplar.
2. **Gruplama** – Hash'leri arasında en fazla `hashThreshold` (varsayılan 10/64) bit fark olan fotoğraflar aynı gruba girer. Çekim zamanı 120 saniyeden uzak olanlar ayrı tutulur; birebir kopyalar (≤3 bit) zamandan bağımsız gruplanır.
3. **En iyiyi seçme** – Grup içi puan: keskinlik %45, pozlama %20, çözünürlük %15, kontrast %10, patlamamış piksel %10. Favori işaretli fotoğraf her zaman tutulur.
4. **Optimize** – Fotoğraf yönüne göre döndürülür, gerekirse küçültülür ve mozjpeg/WebP/AVIF ile yeniden sıkıştırılır. EXIF (tarih, konum) varsayılan olarak korunur. Sonuç büyürse orijinal döner.

Silme işlemi sunucuda değil, cihazda (işletim sisteminin onay penceresiyle) yapılır. Sunucu hiçbir fotoğrafı saklamaz.

## API

| Metot | Yol | Gövde | Yanıt |
|---|---|---|---|
| GET | `/health` | – | `{ status: "ok" }` |
| POST | `/api/photos/analyze` | multipart, alan `photos` (en fazla 100 dosya × 5 MB). Dosya adı = fotoğraf kimliği | `{ results: PhotoFeatures[], failed }` |
| POST | `/api/photos/groups` | JSON `{ photos: (PhotoFeatures & {width,height,fileSize,takenAt,isFavorite})[], options?: { hashThreshold, maxTimeGapSeconds } }` | `{ groups: [{ keep, remove, ranked, reclaimableBytes }], summary }` |
| POST | `/api/photos/optimize?maxDimension=4096&quality=82&format=jpeg&stripMetadata=false` | multipart, alan `photo` (≤30 MB) | Görsel; boyutlar `X-PixClear-*` başlıklarında |

`API_KEY` ortam değişkeni tanımlıysa `/api` istekleri `x-api-key` başlığı ister.

## Geliştirme

```bash
npm install
npm run dev     # http://localhost:8080
npm test
npm run lint
```

## Dağıtım

`main` dalına push → Cloud Build tetikleyicisi `pixclear-backend-main` → [cloudbuild.yaml](cloudbuild.yaml): test, Docker image (`us-central1-docker.pkg.dev/novai-ai-project-new/pixclear-repo/pixclear-backend`), Cloud Run servisi `pixclear-backend` (us-central1).

Elle dağıtım:

```bash
gcloud builds submit --config cloudbuild.yaml --project novai-ai-project-new --region us-central1
```
