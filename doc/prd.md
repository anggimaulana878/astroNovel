# PRD — Web Novel Reader Batch Read

> Versi: 1.2 (Updated — Brotli Compression)
> Status: Draft Final

---

## 1. Ringkasan Produk

Web Novel Reader adalah aplikasi web pribadi untuk membaca novel dari file JSON. Aplikasi ini ditujukan untuk penggunaan satu orang, tanpa autentikasi, tanpa database, dan bisa dideploy ke Vercel gratis.

Fitur utama aplikasi adalah **Batch Read**, yaitu membaca beberapa chapter sekaligus dalam satu halaman. Batch dapat dibuat dengan dua metode:

1. Berdasarkan jumlah chapter
2. Berdasarkan jumlah kata / word count

Aplikasi harus menghasilkan konten utama dalam bentuk HTML langsung dari server, bukan hasil render JavaScript client-side, supaya lebih kompatibel dengan Google Assistant "Read it", screen reader, browser reader mode, dan crawler.

---

## 2. Tujuan Produk

- Membaca novel pribadi dari file JSON
- Mendukung batch read beberapa chapter sekaligus
- Mendukung batch berdasarkan jumlah chapter
- Mendukung batch berdasarkan target jumlah kata
- Konten novel tersedia langsung di HTML response
- Tidak bergantung pada JavaScript untuk menampilkan isi utama novel
- Build Vercel tidak berat walaupun chapter banyak
- Tidak menggunakan login
- Tidak menggunakan database pada versi awal
- Mudah dikembangkan di masa depan

---

## 3. Target Pengguna

**Target awal:**
- Satu pengguna pribadi
- Pengguna yang memiliki koleksi novel sendiri
- Pengguna yang ingin membaca novel panjang dengan nyaman
- Pengguna yang ingin memakai Google Assistant "Read it"
- Pengguna yang ingin membaca beberapa chapter sekaligus dalam satu halaman

**Bukan target awal:**
- Platform publik multi-user
- Aplikasi komunitas novel
- Website novel komersial
- Aplikasi dengan komentar, rating, dan interaksi pembaca
- Sistem author/publisher

---

## 4. Scope Produk

### 4.1 In Scope

Fitur yang masuk versi awal:

- Homepage
- Daftar novel
- Detail novel
- Halaman baca batch
- Batch berdasarkan jumlah chapter
- Batch berdasarkan word count
- Navigasi batch sebelumnya dan berikutnya
- Reader toolbar
- Dark mode
- Font size
- Line height
- Lebar area baca
- Simpan progress baca di localStorage
- Simpan preferensi reader di localStorage
- Data novel dari JSON
- Deploy ke Vercel
- HTML server-rendered untuk halaman baca

### 4.2 Out of Scope

Tidak dibuat pada versi awal:

- Login/register
- Database
- Admin panel
- Upload novel dari UI
- Komentar
- Rating
- Bookmark online
- Sync antar device
- Payment/subscription
- Role user
- API publik
- Multi-user library

> Fitur-fitur itu bisa nanti. Jangan bangun kerajaan dulu kalau rakyatnya baru satu orang, yaitu kamu sendiri.

---

## 5. Keputusan Teknologi

### 5.1 Framework

**Astro**

### 5.2 Mode Rendering

**Astro Hybrid Rendering**

| Halaman | Mode |
|---|---|
| Homepage | Static / Prerender |
| Daftar novel | Static / Prerender |
| Detail novel | Static / Prerender |
| Halaman baca batch | SSR / On-demand |
| Chapter individual (opsional) | SSR / On-demand |

### 5.3 Deploy

**Vercel Free / Hobby**

### 5.4 Adapter

**@astrojs/vercel**

### 5.5 Penyimpanan Data Novel

File JSON yang dikompres dengan Brotli (`.json.br`) lokal di dalam project.

Meta novel tetap disimpan sebagai JSON biasa (tidak dikompres) karena ukurannya kecil dan dibaca saat build static. Chapter disimpan dalam format Brotli karena konten teks panjang mendapatkan rasio kompresi terbaik dari algoritma ini.

### 5.6 Penyimpanan Data User

localStorage browser.

> Tidak perlu database untuk MVP. Untuk satu user, database di awal hanya akan menambah pekerjaan, migrasi, backup, dan alasan baru untuk menatap error jam 2 pagi.

---

## 6. Alasan Pemilihan Astro

Astro dipilih karena aplikasi ini lebih dekat ke content website daripada web app kompleks.

**Alasan utama:**
- Cocok untuk konten teks panjang
- Bisa menghasilkan HTML langsung
- Mendukung static dan SSR dalam satu project
- Cocok untuk file-based content seperti JSON
- Ringan untuk deploy
- Tidak harus full client-side rendering
- Struktur lebih sederhana dibanding Next.js untuk kasus ini
- Lebih content-first dibanding SvelteKit

Astro Hybrid dipilih karena halaman batch tidak perlu digenerate semua saat build. Kalau semua halaman batch digenerate saat deploy, jumlah URL bisa terlalu banyak dan build Vercel bisa lama.

---

## 7. Perbandingan Singkat Framework

| Framework | Cocok? | Catatan |
|---|---|---|
| Astro Hybrid | Paling cocok | Content-first, HTML langsung, bisa SSR untuk batch |
| SvelteKit SSR | Cocok | Bagus untuk app interaktif, tapi sedikit lebih app-heavy |
| Next.js | Bisa | Kuat untuk platform besar, tapi agak berlebihan untuk reader pribadi |
| React/Vite SPA | Kurang cocok | Isi utama berisiko bergantung pada JavaScript client-side |
| Laravel | Terlalu berat | Cocok kalau ada admin/database/auth, bukan reader pribadi sederhana |

**Keputusan final:** Astro Hybrid adalah pilihan utama.

---

## 8. Arsitektur Aplikasi

### 8.1 Arsitektur Umum

```
Astro App
│
├── Static Pages
│   ├── Homepage
│   ├── Daftar novel
│   └── Detail novel
│
├── SSR Pages
│   └── Batch reader
│
├── Data Layer
│   ├── meta.json per novel (plain JSON)
│   └── chapter JSON dikompres Brotli (.json.br)
│
└── Client-side Enhancement
    ├── Dark mode
    ├── Font size
    ├── Line height
    ├── Reader width
    └── Progress baca
```

### 8.2 Prinsip Utama

- Isi novel harus muncul di HTML response awal
- JavaScript hanya untuk fitur tambahan
- Jangan render isi novel dari client-side fetch
- Jangan generate semua batch page saat build
- Jangan membaca satu file JSON raksasa untuk setiap request
- Decompress Brotli hanya untuk chapter yang dibutuhkan, bukan seluruh novel

---

## 9. Struktur Folder

```
src/
  pages/
    index.astro
    novels/
      index.astro
    novel/
      [slug]/
        index.astro
        batch/
          chapter/
            [batch].astro
          words/
            [batch].astro
  layouts/
    BaseLayout.astro
    ReaderLayout.astro
  components/
    NovelCard.astro
    ReaderToolbar.astro
    BatchNavigation.astro
    ChapterSection.astro
  lib/
    novels.ts
    batch.ts
    word-count.ts
    storage.ts
  scripts/
    reader-settings.js
    reading-progress.js

public/
  covers/
    overlord.jpg

data/
  novels/
    overlord/
      meta.json
      chapters/
        001.json.br
        002.json.br
        003.json.br
```

---

## 10. Struktur Data JSON

### 10.1 Struktur Novel

```
data/
  novels/
    [novel-slug]/
      meta.json          ← plain JSON, tidak dikompres
      chapters/
        001.json.br      ← JSON dikompres Brotli
        002.json.br
        003.json.br
```

`meta.json` tidak dikompres karena:
- Ukuran kecil (puluhan byte)
- Dibaca saat build static (prerender), bukan di SSR runtime
- Tidak ada keuntungan signifikan dari kompresi

File chapter menggunakan ekstensi `.json.br` sebagai penanda bahwa isinya adalah JSON yang dikompres Brotli.

### 10.2 Format meta.json

```json
{
  "title": "Overlord",
  "slug": "overlord",
  "author": "Kugane Maruyama",
  "description": "Novel fantasy dark dengan karakter utama Ainz Ooal Gown.",
  "cover": "/covers/overlord.jpg",
  "status": "ongoing",
  "language": "id",
  "totalChapters": 1000,
  "defaultBatchMode": "chapter",
  "defaultChapterLimit": 10,
  "defaultWordLimit": 15000
}
```

> **Catatan:** Field `totalChapters` bersifat display-only untuk UI. Sumber kebenaran jumlah chapter aktual adalah jumlah file di folder `chapters/`. Lihat Section 33.

### 10.3 Format Chapter JSON

```json
{
  "number": 1,
  "title": "Chapter 1",
  "wordCount": 2450,
  "content": "Paragraf pertama chapter 1.\n\nParagraf kedua chapter 1."
}
```

### 10.4 Alasan JSON Per Chapter + Brotli

JSON per chapter dipilih karena:
- SSR batch hanya membaca chapter yang dibutuhkan
- Tidak perlu parsing satu file JSON besar
- Lebih cepat untuk request halaman batch
- Lebih mudah update chapter tertentu
- Lebih aman untuk Vercel Function
- Lebih rapi untuk novel dengan chapter sangat banyak

Brotli dipilih sebagai format kompresi karena:
- Rasio kompresi terbaik untuk konten teks dibanding gzip / zstd
- Teks novel (bahasa natural, repetitif) sangat cocok untuk Brotli — rasio kompresi bisa mencapai 70–80% untuk file teks panjang
- Node.js mendukung Brotli natively via modul `zlib` (tidak perlu dependency tambahan)
- Dekompresi di server-side cepat dan tidak membebani Vercel Function
- Menghemat storage project dan mempercepat cold start Vercel karena file lebih kecil

> Jangan simpan semua novel dalam satu `novels.json.br` raksasa. Kompresi tidak mengubah fakta bahwa kamu masih harus membaca seluruh file untuk mengambil satu chapter.

---

## 11. Routing Aplikasi

### 11.1 Route Utama

```
/                                      Homepage
/novels                                Daftar novel
/novel/[slug]                          Detail novel
/novel/[slug]/batch/chapter/[batch]    Batch berdasarkan chapter
/novel/[slug]/batch/words/[batch]      Batch berdasarkan word count
```

### 11.2 Contoh Route

```
/novel/overlord
/novel/overlord/batch/chapter/1
/novel/overlord/batch/chapter/2
/novel/overlord/batch/words/1
/novel/overlord/batch/words/2
```

### 11.3 Route Opsional Masa Depan

```
/novel/[slug]/chapter/[chapter]
/settings
/search
```

---

## 12. Batch Read

Batch Read adalah fitur utama aplikasi. Fitur ini memungkinkan pengguna membaca beberapa chapter dalam satu halaman.

Aplikasi mendukung dua mode batch:

1. Chapter-based batch
2. Word-count-based batch

---

## 13. Mode Batch Berdasarkan Chapter

### 13.1 Definisi

Mode ini membagi halaman baca berdasarkan jumlah chapter per halaman.

Contoh dengan chapter limit 10:

```
Batch 1 = Chapter 1–10
Batch 2 = Chapter 11–20
Batch 3 = Chapter 21–30
```

### 13.2 Route

```
/novel/[slug]/batch/chapter/[batch]
```

### 13.3 Rumus

```
startChapter = ((batchNumber - 1) * chapterLimit) + 1
endChapter   = batchNumber * chapterLimit
```

### 13.4 Konfigurasi Default

```json
{
  "batchMode": "chapter",
  "chapterLimit": 10
}
```

### 13.5 Pilihan Chapter Limit

- 5 chapter
- **10 chapter (default)**
- 20 chapter

---

## 14. Mode Batch Berdasarkan Word Count

### 14.1 Definisi

Mode ini membagi halaman baca berdasarkan target jumlah kata per halaman. Sistem akan menggabungkan beberapa chapter sampai mendekati target kata tersebut.

### 14.2 Route

```
/novel/[slug]/batch/words/[batch]
```

### 14.3 Contoh Pembagian

Data chapter dengan word limit 15.000 kata:

```
Chapter 1 = 2.000 kata
Chapter 2 = 3.500 kata
Chapter 3 = 4.000 kata
Chapter 4 = 6.000 kata  → total 15.500 kata → tutup batch
Chapter 5 = 2.000 kata  → mulai batch baru
```

Hasil:
```
Batch 1 = Chapter 1–4, ± 15.500 kata
Batch 2 = Chapter 5 dst
```

### 14.4 Aturan Word Count Batch

- Chapter tidak boleh dipotong di tengah
- Batch boleh sedikit melebihi word limit
- Jika satu chapter lebih panjang dari `wordLimit`, chapter itu tetap tampil penuh sendiri
- Batch terakhir boleh kurang dari `wordLimit`
- Word count diambil dari field `wordCount` jika tersedia
- Jika `wordCount` tidak tersedia, sistem menghitung dari `content` saat runtime

### 14.5 Konfigurasi Default

```json
{
  "batchMode": "word_count",
  "wordLimit": 15000
}
```

### 14.6 Pilihan Word Limit

- 5.000 kata
- 10.000 kata
- **15.000 kata (default)**
- 20.000 kata

---

## 15. Logic Batch

### 15.1 Chapter Batch Pseudocode

```ts
function createChapterBatch(chapters, batchNumber, chapterLimit = 10) {
  const startIndex = (batchNumber - 1) * chapterLimit;
  const endIndex = startIndex + chapterLimit;
  return chapters.slice(startIndex, endIndex);
}
```

### 15.2 Word Count Batch Pseudocode

```ts
function createWordBatches(chapters, wordLimit = 15000) {
  const batches = [];
  let currentBatch = [];
  let currentWords = 0;

  for (const chapter of chapters) {
    const chapterWords = chapter.wordCount ?? countWords(chapter.content);

    if (currentBatch.length > 0 && currentWords + chapterWords > wordLimit) {
      batches.push({ chapters: currentBatch, totalWords: currentWords });
      currentBatch = [];
      currentWords = 0;
    }

    currentBatch.push(chapter);
    currentWords += chapterWords;
  }

  if (currentBatch.length > 0) {
    batches.push({ chapters: currentBatch, totalWords: currentWords });
  }

  return batches;
}
```

### 15.3 Word Count Function

```ts
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
```

> Untuk performa, `wordCount` sebaiknya dibuat saat proses import/crawler, bukan dihitung ulang setiap request. Jangan suruh server menghitung kata berkali-kali seperti pegawai magang yang tidak pernah dipromosikan.

---

## 16. Halaman dan Fitur

### 16.1 Homepage

**Tujuan:** Menjadi halaman awal aplikasi.

**Konten:**
- Nama aplikasi
- Deskripsi singkat
- Novel terbaru / daftar novel utama
- Tombol lanjut baca jika ada progress

**Rendering:** Static / Prerender

### 16.2 Daftar Novel

**Route:** `/novels`

**Konten:** Cover novel, judul, author, status, total chapter, tombol baca.

**Rendering:** Static / Prerender

### 16.3 Detail Novel

**Route:** `/novel/[slug]`

**Konten:**
- Cover, judul, author, deskripsi, status, total chapter
- Tombol mulai baca
- Tombol lanjut baca
- Pilihan mode batch
- Daftar batch berdasarkan chapter
- Daftar batch berdasarkan word count

**Rendering:** Static / Prerender

### 16.4 Halaman Batch Read

**Route:**
```
/novel/[slug]/batch/chapter/[batch]
/novel/[slug]/batch/words/[batch]
```

**Konten:**
- Judul novel
- Mode batch aktif
- Nomor batch
- Range chapter
- Total estimasi word count
- Isi chapter dalam batch
- Navigasi batch sebelumnya / berikutnya
- Tombol kembali ke detail novel
- Reader toolbar

**Rendering:** SSR / On-demand

**Contoh tampilan info:**

```
// Chapter mode:
Overlord
Batch Chapter Mode
Chapter 1–10
± 18.500 kata

// Word count mode:
Overlord
Batch Word Count Mode
Chapter 1–7
± 14.800 kata
```

---

## 17. Requirement Google Assistant Read It

Halaman baca harus mengirim isi utama sebagai HTML langsung.

### Struktur HTML Wajib

```html
<main>
  <article>
    <h1>Overlord - Chapter 1 sampai 10</h1>
    <section>
      <h2>Chapter 1</h2>
      <p>Isi chapter 1...</p>
      <p>Isi chapter 1 paragraf berikutnya...</p>
    </section>
    <section>
      <h2>Chapter 2</h2>
      <p>Isi chapter 2...</p>
    </section>
  </article>
</main>
```

### Yang Tidak Boleh

Isi utama novel **tidak boleh** hanya muncul dari JavaScript seperti:

```html
<div id="app"></div>
<script src="/reader.js"></script>
```

JavaScript **boleh** dipakai untuk: dark mode, font size, line height, reader width, simpan progress, keyboard shortcut. Tapi **bukan** untuk memuat isi utama novel.

---

## 18. Reader Toolbar

Reader toolbar adalah komponen untuk mengatur pengalaman membaca.

### Fitur

- Ubah tema: light/dark
- Ubah font size
- Ubah line height
- Ubah lebar konten
- Ubah mode batch
- Ubah chapter limit
- Ubah word limit

### Setting Default

```json
{
  "theme": "dark",
  "fontSize": "medium",
  "lineHeight": "normal",
  "readerWidth": "medium",
  "batchMode": "chapter",
  "chapterLimit": 10,
  "wordLimit": 15000
}
```

### Penyimpanan

Semua setting disimpan di localStorage dengan key: `novel_reader_settings`

---

## 19. Progress Baca

Progress baca disimpan lokal di browser.

### Data yang Disimpan

```json
{
  "lastRead": {
    "novelSlug": "overlord",
    "batchMode": "chapter",
    "batchNumber": 2,
    "chapterRange": {
      "start": 11,
      "end": 20
    },
    "updatedAt": "2026-05-09T10:00:00Z"
  }
}
```

### Fungsi

- Menampilkan tombol lanjut baca
- Mengingat batch terakhir
- Mengingat mode batch terakhir
- Tidak perlu login
- Tidak perlu database

### Keterbatasan

- Progress hanya tersimpan di device/browser yang sama
- Jika browser data dihapus, progress hilang
- Tidak sync antar device

Keterbatasan ini diterima untuk MVP karena aplikasi hanya untuk penggunaan pribadi.

---

## 20. UI/UX Requirement

### 20.1 Gaya Tampilan

- Bersih, fokus pada teks
- Tidak banyak distraksi
- Nyaman untuk membaca lama
- Responsif di desktop dan mobile

### 20.2 Reader Page

- Area teks di tengah
- Lebar teks tidak terlalu panjang
- Font mudah dibaca
- Jarak antar paragraf nyaman
- Navigasi batch jelas
- Toolbar tidak mengganggu isi

### 20.3 Mobile

- Toolbar bisa collapse
- Tombol previous/next mudah ditekan
- Font size default cukup besar
- Tidak ada layout dua kolom

### 20.4 Desktop

- Maksimal width area baca
- Navigasi bisa di atas dan bawah
- Sidebar daftar chapter opsional untuk masa depan

---

## 21. Accessibility Requirement

Wajib:
- Gunakan semantic HTML: `<main>`, `<article>`, `<section>`, `<h1>`, `<h2>`, `<p>`
- Heading harus berurutan
- Kontras warna cukup
- Tombol punya label jelas
- Jangan mengunci zoom browser
- Bisa dinavigasi dengan keyboard

---

## 22. SEO dan Metadata

Setiap halaman batch harus punya:
- Title
- Meta description
- Canonical URL (opsional tapi direkomendasikan)
- Open Graph minimal (opsional)

**Contoh title:** `Overlord - Chapter 1 sampai 10`

**Contoh meta description:** `Baca Overlord chapter 1 sampai 10 dalam mode batch.`

**Format canonical URL:**

```
https://[domain]/novel/[slug]/batch/chapter/[batch]
https://[domain]/novel/[slug]/batch/words/[batch]
```

Canonical URL penting untuk SSR page supaya tidak ada duplikasi jika Vercel meng-cache dengan query parameter berbeda.

---

## 23. Performance Requirement

### 23.1 Target

- Homepage cepat dibuka
- Detail novel cepat dibuka
- Batch page tidak membaca seluruh novel
- Batch page hanya membaca chapter yang dibutuhkan
- Build Vercel tidak generate semua batch

### 23.2 Aturan Performa

- Gunakan JSON per chapter dengan kompresi Brotli (`.json.br`)
- Simpan `wordCount` di JSON sebelum dikompres
- Hindari file JSON raksasa
- Hindari client-side rendering untuk isi utama
- Batch default 10 chapter atau 15.000 kata
- Jangan default batch terlalu besar
- Decompress hanya chapter yang masuk dalam batch, bukan semua chapter novel

### 23.3 Risiko HTML Terlalu Besar

Kalau batch terlalu banyak chapter atau kata:
- Halaman bisa lambat
- Google Assistant bisa kurang stabil
- Browser mobile bisa berat

**Mitigasi:** Batasi pilihan batch; maksimal rekomendasi 20 chapter atau 20.000 kata.

---

## 24. Build dan Deployment

### 24.1 Platform

Vercel Free / Hobby

### 24.2 Commands

```bash
npm run build   # Build command
npm run dev     # Dev command
npx astro add vercel  # Install adapter
```

### 24.3 Strategi Deploy

- Halaman umum diprerender
- Halaman batch dirender on-demand
- Tidak generate semua batch URL saat build

---

## 25. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| JSON terlalu besar | SSR lambat | Pecah JSON per chapter + kompres Brotli |
| Semua batch digenerate saat build | Deploy lama | Gunakan SSR/on-demand untuk batch |
| Google Assistant tidak membaca isi | Fitur utama gagal | Pastikan isi novel ada di HTML response |
| Word count dihitung tiap request | Request lambat | Simpan `wordCount` di JSON sebelum dikompres |
| Batch terlalu panjang | HTML berat | Batasi pilihan batch |
| localStorage hilang | Progress hilang | Diterima untuk MVP |
| Vercel Function kena limit | Halaman gagal | Hindari decompress file besar; satu chapter satu file |
| Struktur URL membingungkan | Sulit maintenance | Pisahkan route chapter mode dan words mode |
| batch number melebihi total batch | Error/blank page | Redirect ke batch 1 (lihat Section 32) |
| totalChapters tidak sinkron dengan file aktual | Silent bug | Gunakan scan folder sebagai sumber kebenaran (lihat Section 33) |
| Dekompresi Brotli gagal / file corrupt | Chapter tidak bisa dibaca | Tangani error per file; tampilkan pesan error per section (lihat Section 32) |
| File `.json.br` tidak dikenali Vercel sebagai static asset | File tidak bisa diakses | Pastikan file dibaca via `fs` di server-side, bukan di-serve sebagai static file |

---

## 26. MVP Requirement

Versi MVP wajib memiliki:

- Setup Astro + @astrojs/vercel
- Struktur data JSON per chapter dikompres Brotli (`.json.br`)
- Script helper untuk kompres chapter JSON ke Brotli
- Homepage
- Daftar novel
- Detail novel
- Batch read berdasarkan chapter
- Batch read berdasarkan word count
- Navigasi previous/next batch
- Reader toolbar sederhana
- Dark mode
- Font size
- localStorage untuk progress baca
- localStorage untuk reader setting
- SSR/on-demand untuk halaman batch

---

## 27. Future Improvement

Bisa dipertimbangkan setelah MVP selesai dan stabil:

- Search novel / chapter
- Bookmark per chapter dan per paragraf
- Auto-scroll
- Offline cache / PWA mode
- Import dari hasil crawler (lncrawl, TXT, EPUB)
- Sync progress antar device
- Admin panel sederhana
- Database ringan (SQLite/Turso)
- Keyboard shortcut lengkap

> Tapi jangan masuk MVP. Kalau semua future improvement dimasukkan dari awal, itu bukan MVP, itu permintaan tolong kepada semesta untuk membuatmu burnout.

---

## 28. Acceptance Criteria

### 28.1 Batch Chapter Mode

- User bisa membuka `/novel/[slug]/batch/chapter/1`
- Sistem menampilkan chapter 1 sampai 10 secara default
- User bisa klik next batch
- User bisa klik previous batch
- Isi chapter muncul langsung di HTML

### 28.2 Batch Word Count Mode

- User bisa membuka `/novel/[slug]/batch/words/1`
- Sistem menggabungkan chapter berdasarkan wordLimit
- Sistem tidak memotong chapter di tengah
- Sistem menampilkan total estimasi word count
- User bisa lanjut ke batch berikutnya

### 28.3 Reader Setting

- User bisa mengubah dark/light mode
- User bisa mengubah font size
- User bisa mengubah line height
- Setting tersimpan setelah refresh

### 28.4 Progress Baca

- Saat user membuka halaman batch, progress tersimpan
- Homepage/detail novel bisa menampilkan tombol lanjut baca
- Tombol lanjut baca mengarah ke batch terakhir

### 28.5 HTML Requirement

- View source atau initial HTML response berisi teks novel
- Isi novel tidak hanya muncul setelah JavaScript berjalan
- Halaman tetap terbaca walaupun JavaScript tambahan gagal

---

## 29. Non-Goals

Hal-hal yang secara sadar tidak dikerjakan di versi awal:

- Tidak ada autentikasi
- Tidak ada dashboard admin
- Tidak ada database
- Tidak ada API publik
- Tidak ada komentar
- Tidak ada fitur sosial
- Tidak ada monetisasi
- Tidak ada upload file dari browser

---

## 30. Kesimpulan Final

**Framework dan arsitektur final:**

```
Astro Hybrid
+ @astrojs/vercel
+ JSON per chapter dikompres Brotli (.json.br)
+ Static untuk halaman umum
+ SSR/on-demand untuk halaman batch
+ localStorage untuk progress dan reader setting
```

**Mode batch final:**

1. **Chapter Mode** — berdasarkan jumlah chapter, default 10, pilihan 5/10/20
2. **Word Count Mode** — berdasarkan target kata, default 15.000, pilihan 5.000/10.000/15.000/20.000, tidak memotong chapter di tengah

**Keputusan ini paling sesuai karena:**
- Build Vercel tetap ringan
- Tidak perlu generate ribuan halaman batch
- Konten tetap HTML server-rendered
- Kompatibel dengan Google Assistant Read it
- Cocok untuk file JSON dan penggunaan satu orang
- Tidak membutuhkan login atau database
- Masih mudah dikembangkan nanti

> Versi pendeknya: Astro Hybrid + JSON per chapter + SSR batch page adalah desain paling waras untuk kebutuhan kamu. Cukup kuat untuk novel panjang, cukup ringan untuk Vercel gratis, dan tidak membuat browser harus menebak isi novel dari JavaScript seperti sedang memecahkan kasus kriminal.

---

## 31. Format Konten Chapter

Field `content` dalam chapter JSON menggunakan **plain text**, dengan paragraf dipisahkan oleh newline ganda (`\n\n`).

**Aturan rendering:**
- Setiap blok teks dipisah `\n\n` dikonversi menjadi satu tag `<p>`
- Tidak menyimpan HTML mentah di dalam JSON (keamanan)
- Tidak menggunakan Markdown (menghindari parsing dependency)

**Contoh content di JSON:**

```json
{
  "content": "Ainz berdiri di tengah ruangan.\n\nDia menatap langit-langit dengan tenang."
}
```

**Hasil render HTML:**

```html
<p>Ainz berdiri di tengah ruangan.</p>
<p>Dia menatap langit-langit dengan tenang.</p>
```

---

## 32. Error States

Kondisi error yang harus ditangani secara eksplisit:

| Kondisi | Penanganan |
|---|---|
| Batch number < 1 atau > total batch | Redirect ke batch 1 |
| File `.json.br` tidak ditemukan (satu file) | Tampilkan pesan error per section; chapter lain tetap tampil |
| Dekompresi Brotli gagal / file corrupt | Tampilkan pesan error per section; chapter lain tetap tampil |
| Semua chapter dalam batch gagal dibaca/decompress | Tampilkan halaman error dengan tombol kembali ke detail novel |
| meta.json tidak ditemukan | Tampilkan halaman 404 |
| wordCount tidak tersedia di JSON | Hitung dari `content` saat runtime (lihat Section 36) |

---

## 33. Sumber Data Total Chapter

Sistem menentukan total chapter dari **jumlah file `.json.br` di folder `chapters/`**, bukan dari field `totalChapters` di meta.json.

**Aturan:**
- Field `totalChapters` di meta.json bersifat display-only untuk UI
- Jika tidak sinkron, sistem mengikuti jumlah file aktual
- Konsekuensi: saat chapter baru ditambahkan, tidak perlu update meta.json
- Saat scan folder, filter hanya file dengan ekstensi `.json.br`; abaikan file lain

**Implikasi untuk word count batch:**
- Sistem scan semua file `.json.br` untuk menghitung total batch
- Untuk word count batch, sistem perlu membaca `wordCount` dari setiap file
- Karena `wordCount` ada di dalam file yang dikompres, **sangat disarankan** membuat file index terpisah yang menyimpan `wordCount` per chapter tanpa harus decompress satu per satu (lihat Section 37)

---

## 34. Batch Navigation Edge Case

| Kondisi | Behavior |
|---|---|
| Batch 1 | Tombol Previous **disembunyikan** (hidden, bukan disabled) |
| Batch terakhir | Tombol Next **disembunyikan** |
| Hanya ada 1 batch total | Kedua tombol disembunyikan |
| Batch 1 — aksi kembali | Gunakan tombol "Kembali ke Detail Novel" yang terpisah, bukan Previous |

Tombol Previous di batch 1 tidak pernah berfungsi sebagai navigasi ke detail novel. Navigasi ke detail novel selalu melalui tombol dedicated.

---

## 35. Reader Toolbar UI Behavior

### Desktop

- Toolbar fixed di bagian atas, selalu visible
- Auto-hide saat scroll down, muncul kembali saat scroll up atau hover area atas

### Mobile

- Toolbar berupa floating action button (FAB) di pojok kanan bawah
- Tap FAB membuka panel setting dari bawah (bottom sheet)
- Bottom sheet bisa di-dismiss dengan tap di luar area atau swipe down
- FAB tidak menutupi tombol navigasi batch

---

## 36. wordCount Handling

**Prioritas pembacaan wordCount:**

1. Baca dari file index `chapters-index.json` jika tersedia → **paling efisien** (lihat Section 37)
2. Decompress file `.json.br` dan baca field `wordCount` → **fallback normal**
3. Jika `wordCount` tidak ada di JSON, hitung dari field `content` saat runtime → **fallback terakhir**
4. Hasil hitungan runtime **tidak** ditulis kembali ke file

**Rekomendasi:** Saat import atau crawl chapter baru, selalu sertakan field `wordCount` di JSON sebelum dikompres. Hitungan runtime adalah fallback darurat, bukan standar operasi.

**Dampak jika wordCount tidak ada di semua chapter:**
- Word count batch mode tetap berfungsi
- Tapi setiap request harus decompress dan menghitung ulang semua chapter → performa turun signifikan
- Untuk novel dengan 500+ chapter, ini bisa menyebabkan timeout di Vercel Function

---

## 37. Chapter Index File

Untuk menghindari decompress seluruh chapter hanya untuk menghitung word count batch, sistem menggunakan file index ringan yang disimpan sebagai plain JSON.

**Lokasi:**

```
data/
  novels/
    overlord/
      meta.json
      chapters-index.json    ← index ringan, plain JSON
      chapters/
        001.json.br
        002.json.br
```

**Format chapters-index.json:**

```json
[
  { "number": 1, "file": "001.json.br", "wordCount": 2450 },
  { "number": 2, "file": "002.json.br", "wordCount": 3100 },
  { "number": 3, "file": "003.json.br", "wordCount": 2800 }
]
```

**Fungsi:**
- Digunakan saat menghitung pembagian word count batch — tanpa harus decompress satu pun file chapter
- Digunakan saat scan total chapter — tanpa harus list folder
- Diupdate setiap kali chapter baru ditambahkan (oleh script import)

**Aturan:**
- File ini adalah plain JSON, tidak dikompres
- Tidak menyimpan `content` — hanya metadata ringan
- Jika `chapters-index.json` tidak ada, sistem fallback ke scan folder + decompress per file
- Script import wajib mengupdate file ini setiap kali ada chapter baru

**Keuntungan:**
- Word count batch calculation tidak perlu membuka satu pun file `.json.br`
- Total chapter bisa diketahui tanpa scan folder
- Sangat cepat untuk novel dengan ribuan chapter

---

## 38. Brotli Implementation Guide

### Kompres Chapter JSON ke Brotli

Node.js mendukung Brotli natively via `zlib`. Tidak perlu package tambahan.

**Script kompres (dijalankan saat import chapter baru):**

```ts
import { brotliCompressSync, constants } from 'zlib';
import { readFileSync, writeFileSync } from 'fs';

function compressChapter(inputPath: string, outputPath: string) {
  const json = readFileSync(inputPath, 'utf-8');
  const compressed = brotliCompressSync(Buffer.from(json), {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11  // max quality, cocok untuk data statis
    }
  });
  writeFileSync(outputPath, compressed);
}

// Contoh: kompres 001.json → 001.json.br
compressChapter(
  'data/novels/overlord/chapters/001.json',
  'data/novels/overlord/chapters/001.json.br'
);
```

### Baca dan Decompress di SSR Page

```ts
import { brotliDecompressSync } from 'zlib';
import { readFileSync } from 'fs';
import { join } from 'path';

function readChapter(slug: string, chapterFile: string) {
  const filePath = join(process.cwd(), 'data', 'novels', slug, 'chapters', chapterFile);
  const compressed = readFileSync(filePath);
  const json = brotliDecompressSync(compressed).toString('utf-8');
  return JSON.parse(json);
}
```

### Catatan Penting

- Gunakan `BROTLI_PARAM_QUALITY: 11` (maksimal) saat kompres — data novel bersifat statis, kompresi dilakukan sekali, dekompresi berkali-kali. Trade-off ini menguntungkan.
- File `.json.br` **tidak boleh** diletakkan di folder `public/` — Vercel akan meng-serve-nya sebagai static asset dengan header `Content-Encoding: br` yang tidak sesuai ekspektasi.
- File harus dibaca via `fs` di server-side SSR, bukan via HTTP request.
- Brotli level 11 pada teks novel biasanya menghasilkan file 20–30% lebih kecil dibanding gzip level 9.
- File `.json` asli tidak perlu disimpan setelah dikompres, tapi simpan dulu saat development sebelum pipeline import stabil.

---

*End of Document*