# Kompatibilitas Google Assistant "Read It"

Panduan lengkap untuk membuat halaman web yang kompatibel dengan fitur "Read It" Google Assistant.

## Apa itu Google Assistant "Read It"?

Google Assistant "Read It" adalah fitur text-to-speech yang memungkinkan pengguna mendengarkan konten artikel web. Fitur ini tersedia di:
- Chrome Android (via Google Assistant)
- Google app (Android & iOS)
- Google Home / Nest devices

**Cara menggunakan:**
1. Buka artikel di browser
2. Aktifkan Google Assistant
3. Katakan "Read it" atau "Baca halaman ini"
4. Assistant akan membacakan konten artikel

---

## Mengapa Halaman Tidak Bisa Dibaca?

Google Assistant "Read It" gagal dengan error:
> "Maaf saya tidak bisa membacakan isi halaman itu"

**Penyebab umum:**
1. ❌ Konten dimuat via JavaScript (client-side rendering)
2. ❌ Struktur HTML tidak semantik
3. ❌ Tidak ada markup Schema.org
4. ❌ Robots meta tag memblokir akses
5. ❌ Konten terlalu pendek atau tidak terdeteksi

---

## Persyaratan Kompatibilitas

### 1. **Server-Side Rendering (SSR) - WAJIB**

Google Assistant crawler **tidak mengeksekusi JavaScript**. Semua konten harus ada di HTML awal saat halaman dimuat.

**Prinsip:**
- Konten harus di-render di server, bukan di browser
- HTML yang dikirim ke browser sudah berisi semua teks artikel
- JavaScript hanya untuk enhancement (tema, animasi, navigasi), bukan untuk loading konten

**Mengapa ini penting:**
Google Assistant crawler bekerja seperti bot yang hanya membaca HTML. Jika konten dimuat via JavaScript setelah halaman load, crawler tidak akan melihatnya.

**Cara mengecek:**
1. Buka halaman di browser
2. View Page Source (Ctrl+U atau Cmd+U)
3. Cari teks artikel di source code
4. Jika teks artikel ada di source code → ✅ SSR
5. Jika teks artikel tidak ada di source code → ❌ Client-side rendering

---

### 2. **Semantic HTML Structure**

Gunakan tag HTML semantik yang jelas untuk membantu Google Assistant mengidentifikasi konten utama.

**Tag yang Wajib:**

| Tag | Fungsi | Contoh |
|-----|--------|--------|
| `<article>` | Container utama konten artikel | Wrap seluruh artikel |
| `<header>` | Judul dan metadata artikel | Judul chapter, author, date |
| `<section>` | Pembatas antar bagian konten | Setiap chapter dalam batch mode |
| `<p>` | Paragraf konten | Setiap paragraf teks |
| `<h1>` - `<h6>` | Heading hierarki | Judul chapter, sub-judul |

**Atribut yang Direkomendasikan:**

| Atribut | Fungsi | Nilai |
|---------|--------|-------|
| `role="main"` | Menandai konten utama halaman | Pada `<article>` |
| `lang="en"` | Bahasa konten untuk TTS | `en`, `id`, `zh`, dll |
| `aria-label` | Label aksesibilitas | Deskripsi konten |
| `itemProp="articleBody"` | Schema.org markup | Pada container konten |

**Contoh struktur minimal:**
```html
<article role="main" lang="en">
  <header>
    <h1>Judul Artikel</h1>
  </header>
  <section>
    <p>Paragraf pertama...</p>
    <p>Paragraf kedua...</p>
  </section>
</article>
```

**Hindari:**
- ❌ Menggunakan `<div>` untuk paragraf teks (gunakan `<p>`)
- ❌ Konten utama di dalam `<aside>` atau `<footer>`
- ❌ Nested `<article>` yang membingungkan
- ❌ Tag custom atau non-standard

---

### 3. **JSON-LD Schema.org Markup - WAJIB**

Google Assistant menggunakan JSON-LD untuk mengidentifikasi konten yang bisa dibaca.

**Apa itu JSON-LD?**
JSON-LD adalah format metadata yang ditanam di `<script type="application/ld+json">` untuk memberitahu Google tentang struktur konten.

**Struktur minimal:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Judul Artikel",
  "inLanguage": "en",
  "isAccessibleForFree": true,
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": ["#content", "#content p"]
  }
}
```

**Field yang Wajib:**

| Field | Fungsi | Contoh Nilai |
|-------|--------|--------------|
| `@context` | Namespace Schema.org | `"https://schema.org"` |
| `@type` | Tipe konten | `"Article"` |
| `headline` | Judul artikel | `"Chapter 1 - Novel Title"` |
| `inLanguage` | Bahasa konten | `"en"`, `"id"`, `"zh"` |
| `isAccessibleForFree` | Konten gratis? | `true` |
| `speakable` | Konten yang bisa dibaca | Object dengan `cssSelector` |

**Field `speakable` - PALING PENTING:**
```json
"speakable": {
  "@type": "SpeakableSpecification",
  "cssSelector": [
    "#article-content",
    "#article-content section",
    "#article-content p"
  ]
}
```

`cssSelector` adalah array CSS selector yang menunjuk ke elemen HTML yang berisi konten yang bisa dibaca. Google Assistant akan membaca teks dari elemen-elemen ini.

**Tips:**
- Gunakan ID selector (`#content`) untuk spesifik
- Tambahkan selector untuk paragraf (`#content p`)
- Jika ada multiple sections, tambahkan selector untuk setiap section
- Pastikan selector match dengan HTML yang ada

**Field opsional tapi direkomendasikan:**
```json
{
  "author": {
    "@type": "Person",
    "name": "Nama Author"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Nama Website"
  },
  "wordCount": 5000,
  "accessibilityFeature": ["readingOrder", "structuralNavigation"],
  "accessMode": ["textual"]
}
```

**Cara memasang JSON-LD:**
Tambahkan di `<head>` atau sebelum `</body>`:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Judul Artikel",
  "inLanguage": "en",
  "isAccessibleForFree": true,
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": ["#content", "#content p"]
  }
}
</script>
```

---

### 4. **Robots Meta Tag**

Izinkan Google membaca seluruh konten dengan `max-snippet: -1`.

**Apa itu robots meta tag?**
Meta tag yang memberitahu search engine crawler apa yang boleh dan tidak boleh dilakukan dengan halaman.

**Format:**
```html
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
```

**Penjelasan setiap directive:**

| Directive | Fungsi | Nilai yang Direkomendasikan |
|-----------|--------|------------------------------|
| `index` | Izinkan indexing di search results | `index` (bukan `noindex`) |
| `follow` | Izinkan crawling link di halaman | `follow` (bukan `nofollow`) |
| `max-snippet` | Panjang maksimal snippet yang boleh ditampilkan | `-1` (unlimited) |
| `max-image-preview` | Ukuran preview gambar | `large` |

**PENTING: `max-snippet:-1`**
Ini adalah directive paling kritis untuk Google Assistant "Read It". Nilai `-1` berarti "tidak ada batasan" - Google boleh membaca seluruh konten artikel.

**Nilai lain yang TIDAK kompatibel:**
- ❌ `max-snippet:0` - Google tidak boleh membaca konten
- ❌ `max-snippet:100` - Google hanya boleh membaca 100 karakter
- ❌ `noindex` - Halaman tidak akan di-crawl sama sekali

**Cara memasang:**
Tambahkan di `<head>`:
```html
<head>
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
</head>
```

---

### 5. **Content Sanitization untuk TTS**

Bersihkan HTML agar hanya menyisakan tag semantik. Google Assistant TTS tidak mendukung tag kompleks.

**Mengapa perlu sanitization?**
Google Assistant text-to-speech (TTS) engine hanya bisa membaca teks plain dan tag semantik sederhana. Tag kompleks, script, atau elemen interaktif akan mengganggu pembacaan.

**Tag yang Diizinkan:**

**Inline tags:**
- `<em>` - Emphasis (italic)
- `<strong>` - Strong emphasis (bold)
- `<b>` - Bold
- `<i>` - Italic
- `<span>` - Generic inline container
- `<br>` - Line break
- `<sub>` - Subscript
- `<sup>` - Superscript

**Block tags:**
- `<p>` - Paragraph
- `<h1>` - `<h6>` - Headings
- `<section>` - Section
- `<header>` - Header
- `<article>` - Article
- `<nav>` - Navigation

**Tag yang Harus Dihapus:**

| Tag | Mengapa Harus Dihapus |
|-----|------------------------|
| `<div>` | Tidak semantik, ganti dengan `<section>` atau `<p>` |
| `<script>` | JavaScript tidak dibaca oleh TTS |
| `<style>` | CSS tidak dibaca oleh TTS |
| `<iframe>` | Embedded content tidak bisa dibaca |
| `<button>`, `<input>`, `<form>` | Elemen interaktif mengganggu pembacaan |
| `<img>` (tanpa alt) | Gambar tanpa alt text tidak bisa dibaca |
| `<video>`, `<audio>` | Media tidak bisa dibaca |
| Tag custom | Non-standard tags tidak dikenali |

**Prinsip sanitization:**
1. Hapus semua tag yang tidak ada di daftar "diizinkan"
2. Ganti `<div>` dengan `<p>` atau `<section>` sesuai konteks
3. Hapus semua atribut kecuali `id`, `class`, `lang`, `aria-*`, `role`
4. Hapus inline styles
5. Pastikan struktur heading hierarkis (h1 → h2 → h3, tidak skip)

**Contoh sebelum sanitization:**
```html
<div class="content">
  <div style="color: red;">
    <script>alert('hello');</script>
    Paragraf pertama
  </div>
  <button onclick="next()">Next</button>
</div>
```

**Contoh setelah sanitization:**
```html
<section class="content">
  <p>Paragraf pertama</p>
</section>
```

---

### 6. **Navigation Links dengan rel Attributes**

Untuk konten multi-halaman (batch mode, pagination), tambahkan navigation links dengan atribut `rel` yang benar.

**Mengapa ini penting?**
Google Assistant perlu tahu struktur navigasi konten untuk:
- Melanjutkan pembacaan ke halaman berikutnya
- Kembali ke halaman sebelumnya
- Memahami urutan konten

**Atribut `rel` yang Wajib:**

| Atribut | Fungsi | Kapan Digunakan |
|---------|--------|-----------------|
| `rel="prev"` | Link ke konten sebelumnya | Pada link "Previous" |
| `rel="next"` | Link ke konten berikutnya | Pada link "Next" |
| `rel="first"` | Link ke konten pertama | Pada link "First" (opsional) |
| `rel="last"` | Link ke konten terakhir | Pada link "Last" (opsional) |

**Struktur minimal:**
```html
<nav aria-label="Chapter navigation">
  <a href="/chapter-1" rel="prev">Previous</a>
  <a href="/chapter-3" rel="next">Next</a>
</nav>
```

**Struktur lengkap:**
```html
<nav aria-label="Chapter navigation" role="navigation">
  <a href="/chapter-1" rel="first">First</a>
  <a href="/chapter-1" rel="prev">Previous</a>
  <span>Chapter 2 of 100</span>
  <a href="/chapter-3" rel="next">Next</a>
  <a href="/chapter-100" rel="last">Last</a>
</nav>
```

**Tips:**
- Gunakan `<nav>` tag untuk semantic navigation
- Tambahkan `aria-label` untuk accessibility
- Jika di halaman pertama, jangan tampilkan link "Previous"
- Jika di halaman terakhir, jangan tampilkan link "Next"
- Link harus mengarah ke URL yang valid (bukan `#` atau `javascript:void(0)`)

**Untuk batch mode:**
```html
<nav aria-label="Batch navigation">
  <a href="/read/1-20" rel="prev">Chapters 1-20</a>
  <span>Chapters 21-40</span>
  <a href="/read/41-60" rel="next">Chapters 41-60</a>
</nav>
```

---

### 7. **Language Detection dan Attribute**

Deteksi bahasa konten secara otomatis dan set atribut `lang` yang sesuai.

**Mengapa ini penting?**
Google Assistant TTS engine perlu tahu bahasa konten untuk:
- Memilih voice yang tepat (English voice, Indonesian voice, dll)
- Pronounce kata dengan benar
- Menghindari pembacaan yang aneh (English voice membaca teks Indonesia)

**Atribut `lang` harus ada di 2 tempat:**

1. **Tag `<html>`** - Bahasa default halaman
```html
<html lang="en">
```

2. **Tag `<article>` atau `<section>`** - Bahasa konten spesifik
```html
<article lang="en">
  <section lang="zh">中文内容</section>
  <section lang="en">English content</section>
</article>
```

**Kode bahasa yang umum:**

| Kode | Bahasa |
|------|--------|
| `en` | English |
| `id` | Indonesian |
| `zh` | Chinese (Simplified) |
| `zh-TW` | Chinese (Traditional) |
| `ja` | Japanese |
| `ko` | Korean |
| `es` | Spanish |
| `fr` | French |
| `de` | German |

**Cara mendeteksi bahasa:**

**Metode 1: Deteksi karakter CJK (Chinese, Japanese, Korean)**
- Jika teks mengandung > 30% karakter CJK → bahasa CJK
- Chinese: U+4E00 - U+9FFF
- Japanese: Hiragana (U+3040 - U+309F), Katakana (U+30A0 - U+30FF)
- Korean: Hangul (U+AC00 - U+D7AF)

**Metode 2: Deteksi kata kunci bahasa Indonesia**
- Jika teks mengandung kata: "yang", "dan", "di", "ke", "dari" → Indonesian

**Metode 3: Default ke English**
- Jika tidak terdeteksi bahasa lain → English

**Contoh implementasi konsep:**
1. Ambil 200 karakter pertama dari konten
2. Hitung persentase karakter CJK
3. Jika > 30% CJK → set `lang="zh"` atau `lang="ja"` atau `lang="ko"`
4. Jika tidak, cek kata kunci Indonesian
5. Jika tidak ada, default `lang="en"`

**Multi-language content:**
Jika artikel mengandung multiple bahasa, set `lang` per section:
```html
<article lang="en">
  <section lang="en">
    <p>This is English content.</p>
  </section>
  <section lang="zh">
    <p>这是中文内容。</p>
  </section>
  <section lang="id">
    <p>Ini konten bahasa Indonesia.</p>
  </section>
</article>
```

---

## Checklist Implementasi

Gunakan checklist ini untuk memastikan kompatibilitas Google Assistant:

### ✅ Checklist Teknis

- [ ] **SSR**: Semua konten di-render server-side, bukan client-side
  - Cek: View Page Source → teks artikel harus terlihat di HTML
- [ ] **Semantic HTML**: Gunakan `<article>`, `<section>`, `<p>` untuk struktur konten
  - Cek: Tidak ada `<div>` untuk paragraf teks
- [ ] **JSON-LD**: Tambahkan schema.org markup dengan `speakable` specification
  - Cek: Ada `<script type="application/ld+json">` di HTML
- [ ] **Robots Meta**: Set `max-snippet:-1` untuk akses penuh
  - Cek: Ada `<meta name="robots" content="...max-snippet:-1...">` di `<head>`
- [ ] **Content Sanitization**: Hapus tag non-semantik dan elemen interaktif
  - Cek: Tidak ada `<script>`, `<button>`, `<form>` di konten artikel
- [ ] **Language Attributes**: Set `lang` attribute pada `<html>` dan `<article>`
  - Cek: Ada `<html lang="en">` dan `<article lang="en">`
- [ ] **Navigation Links**: Tambahkan `rel="prev"` dan `rel="next"` untuk multi-halaman
  - Cek: Link navigasi punya atribut `rel`
- [ ] **Accessibility**: Tambahkan `role`, `aria-label` attributes
  - Cek: Ada `role="main"` pada `<article>`

### ✅ Checklist Konten

- [ ] **Paragraf pertama ≥ 270 karakter**: Google Assistant butuh konten minimal
- [ ] **Tidak ada duplicate title**: Jangan ulangi judul di paragraf pertama
- [ ] **Struktur heading hierarkis**: h1 → h2 → h3 (tidak skip level)
- [ ] **Alt text untuk gambar**: Semua `<img>` punya atribut `alt`

---

## Cara Testing Kompatibilitas

### 1. **Manual Testing dengan Google Assistant**

**Langkah:**
1. Buka halaman di Chrome Android
2. Aktifkan Google Assistant (long press home button atau "Hey Google")
3. Katakan "Read it" atau "Baca halaman ini"
4. Verifikasi Assistant membaca seluruh konten

**Hasil yang diharapkan:**
- ✅ Assistant mulai membaca konten artikel
- ✅ Assistant membaca semua paragraf secara berurutan
- ✅ Assistant bisa melanjutkan ke halaman berikutnya (jika ada)

**Jika gagal:**
- ❌ Error: "Maaf saya tidak bisa membacakan isi halaman itu"
- ❌ Assistant hanya membaca sebagian konten
- ❌ Assistant membaca elemen UI (button, menu) bukan konten

### 2. **Structured Data Testing Tool**

**URL:** https://search.google.com/test/rich-results

**Langkah:**
1. Paste URL halaman atau HTML code
2. Klik "Test URL" atau "Test Code"
3. Tunggu hasil validasi

**Hasil yang diharapkan:**
- ✅ "Article" schema terdeteksi
- ✅ Tidak ada error atau warning
- ✅ Field `speakable` terdeteksi dengan benar

**Jika ada error:**
- ❌ "Missing required field" → Tambahkan field yang diminta
- ❌ "Invalid value" → Perbaiki format value
- ❌ "Schema not detected" → Cek format JSON-LD

### 3. **View Page Source Test**

**Langkah:**
1. Buka halaman di browser
2. Klik kanan → "View Page Source" (atau Ctrl+U / Cmd+U)
3. Cari teks artikel di source code (Ctrl+F / Cmd+F)

**Hasil yang diharapkan:**
- ✅ Teks artikel terlihat di HTML source
- ✅ Teks artikel ada di dalam tag `<article>` atau `<section>`
- ✅ Tidak ada placeholder atau "Loading..."

**Jika gagal:**
- ❌ Teks artikel tidak ada di source → Client-side rendering
- ❌ Teks artikel di dalam `<script>` tag → JavaScript rendering
- ❌ Hanya ada "Loading..." → Konten belum di-render

### 4. **Lighthouse Accessibility Audit**

**Cara menjalankan:**
1. Buka halaman di Chrome
2. Buka DevTools (F12)
3. Tab "Lighthouse"
4. Pilih "Accessibility" category
5. Klik "Generate report"

**Target score:** ≥ 90

**Hasil yang diharapkan:**
- ✅ "Document has a `<title>` element"
- ✅ "`<html>` element has a `lang` attribute"
- ✅ "Heading elements are in a sequentially-descending order"
- ✅ "Links have a discernible name"

### 5. **HTML Validation**

**URL:** https://validator.w3.org/

**Langkah:**
1. Paste URL halaman atau HTML code
2. Klik "Check"
3. Review errors dan warnings

**Hasil yang diharapkan:**
- ✅ Tidak ada error HTML
- ✅ Warning minimal (jika ada)

**Error yang harus diperbaiki:**
- ❌ "Stray end tag" → Tutup tag dengan benar
- ❌ "Duplicate ID" → ID harus unique
- ❌ "Bad value for attribute" → Perbaiki format atribut

---

## Troubleshooting

### ❌ Error: "Maaf saya tidak bisa membacakan isi halaman itu"

**Kemungkinan Penyebab:**

#### 1. Konten dimuat client-side via JavaScript

**Cara mengecek:**
- View Page Source → teks artikel tidak ada di HTML

**Solusi:**
- Render konten di server-side
- Pastikan HTML yang dikirim ke browser sudah berisi semua teks

#### 2. Tidak ada JSON-LD `speakable` specification

**Cara mengecek:**
- View Page Source → tidak ada `<script type="application/ld+json">`
- Atau ada JSON-LD tapi tidak ada field `speakable`

**Solusi:**
- Tambahkan JSON-LD dengan field `speakable`
- Pastikan `cssSelector` mengarah ke elemen yang benar

#### 3. `robots` meta tag memblokir akses

**Cara mengecek:**
- View Page Source → cari `<meta name="robots">`
- Cek apakah ada `noindex`, `nosnippet`, atau `max-snippet:0`

**Solusi:**
- Ganti dengan `index, follow, max-snippet:-1`
- Hapus `noindex` dan `nosnippet`

#### 4. Konten terlalu pendek

**Cara mengecek:**
- Hitung karakter di paragraf pertama
- Jika < 270 karakter → terlalu pendek

**Solusi:**
- Gabungkan beberapa paragraf pendek
- Hapus duplicate title di paragraf pertama
- Pastikan paragraf pertama ≥ 270 karakter

#### 5. Tag HTML tidak semantik

**Cara mengecek:**
- View Page Source → cari konten artikel
- Cek apakah konten di dalam `<div>` bukan `<article>` atau `<p>`

**Solusi:**
- Ganti `<div>` dengan `<article>`, `<section>`, atau `<p>`
- Gunakan tag semantik yang benar

#### 6. `speakable` cssSelector tidak match

**Cara mengecek:**
- Buka DevTools → Console
- Jalankan: `document.querySelectorAll('#your-selector')`
- Jika return empty → selector salah

**Solusi:**
- Perbaiki cssSelector di JSON-LD
- Pastikan selector mengarah ke elemen yang ada di HTML
- Test selector di DevTools Console

---

### ❌ Assistant hanya membaca sebagian konten

**Kemungkinan Penyebab:**

#### 1. `speakable` cssSelector hanya mengarah ke sebagian konten

**Solusi:**
- Tambahkan selector untuk semua section konten
- Contoh: `["#content", "#content section", "#content p"]`

#### 2. Konten di-load progressively via JavaScript

**Solusi:**
- Render semua konten di server-side
- Jangan load konten via AJAX setelah page load

---

### ❌ Assistant membaca elemen UI (button, menu)

**Kemungkinan Penyebab:**

#### 1. `speakable` cssSelector terlalu luas

**Solusi:**
- Gunakan selector yang lebih spesifik
- Hindari selector seperti `body` atau `main` yang mencakup UI elements

#### 2. Elemen UI tidak di-exclude dari konten

**Solusi:**
- Pisahkan UI elements dari konten artikel
- Gunakan `<aside>` atau `<nav>` untuk UI elements
- Jangan taruh button/menu di dalam `<article>`

---

## Best Practices

### 1. **Prioritaskan SSR**

Selalu render konten di server-side. Client-side rendering hanya untuk enhancement (tema, animasi, interaktif), bukan untuk loading konten utama.

### 2. **Gunakan Semantic HTML**

Tag semantik membantu Google Assistant dan screen reader memahami struktur konten. Hindari `<div>` soup.

### 3. **Test di Real Device**

Simulator tidak cukup. Test di real Android device dengan Google Assistant untuk memastikan kompatibilitas.

### 4. **Monitor Structured Data**

Gunakan Google Search Console untuk monitor structured data errors dan warnings.

### 5. **Keep Content Clean**

Hapus elemen yang tidak perlu (ads, popups, overlays) dari konten artikel. Fokus pada readability.

### 6. **Optimize for Accessibility**

Kompatibilitas Google Assistant = kompatibilitas screen reader. Jika accessible untuk screen reader, biasanya compatible dengan Google Assistant.

---

## FAQ

### Q: Apakah Google Assistant "Read It" gratis?

**A:** Ya, fitur ini gratis untuk pengguna dan tidak ada biaya untuk website owner.

### Q: Apakah harus pakai HTTPS?

**A:** Ya, Google Assistant hanya bekerja di HTTPS. HTTP tidak didukung.

### Q: Apakah bisa membaca konten berbayar (paywall)?

**A:** Tidak. Google Assistant hanya membaca konten yang `isAccessibleForFree: true`. Konten di balik paywall tidak bisa dibaca.

### Q: Apakah bisa membaca PDF?

**A:** Tidak. Google Assistant hanya membaca HTML. PDF harus dikonversi ke HTML terlebih dahulu.

### Q: Berapa lama Google crawl halaman baru?

**A:** Bervariasi, bisa beberapa jam hingga beberapa hari. Submit sitemap di Google Search Console untuk mempercepat.

### Q: Apakah bisa membaca konten dinamis (infinite scroll)?

**A:** Tidak. Google Assistant hanya membaca konten yang ada di HTML awal. Infinite scroll harus di-convert ke pagination dengan URL unik per halaman.

### Q: Apakah bisa membaca konten di dalam accordion/tab?

**A:** Ya, asalkan konten ada di HTML (tidak di-load via JavaScript). Tapi lebih baik expand semua accordion/tab untuk reading mode.

### Q: Apakah bisa membaca multiple bahasa dalam satu halaman?

**A:** Ya, gunakan atribut `lang` per section. Google Assistant akan switch voice sesuai bahasa.

---

## Referensi

### Dokumentasi Resmi

- [Google Assistant Web Content Guidelines](https://developers.google.com/assistant/content/web)
- [Schema.org Article Specification](https://schema.org/Article)
- [Schema.org SpeakableSpecification](https://schema.org/SpeakableSpecification)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

### Tools

- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [W3C HTML Validator](https://validator.w3.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Google Search Console](https://search.google.com/search-console)

---

## Changelog

### 2026-05-09
- Initial documentation (generic version without code references)
- Added 7 compatibility requirements
- Added testing guide and troubleshooting
- Added FAQ and best practices