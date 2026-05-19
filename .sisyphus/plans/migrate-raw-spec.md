# Spec: `scripts/migrate-raw.mjs`

## Overview

Single Node.js ESM script that converts raw novel data from `public/raw/<Name>/` into the production format at `public/novels/<slug>/`. Zero external dependencies — uses only Node built-in modules (`fs`, `path`, `zlib`).

---

## Input Contract

**Source directory**: `public/raw/<Novel Name>/`

```
public/raw/Dual Cultivation/
├── meta.json          # Novel metadata (key: "novel")
├── cover.jpg          # Cover image
└── json/
    ├── 00001.json     # Individual chapter files
    ├── 00002.json
    └── ...NNNNN.json
```

### `meta.json` → `novel` key

| Field | Type | Used |
|---|---|---|
| `title` | string | ✓ slug generation, info.json, metadata.json, index.json |
| `authors` | string[] | ✓ info.json, index.json |
| `synopsis` | string (HTML) | ✓ stripped to plain text for info.json, index.json |
| `tags` | string[] | ✓ mapped to `genres` |
| `url` | string | ✓ `sourceUrl` + domain extraction for `source` |
| `language` | string | ✓ metadata.json |
| `is_rtl` | boolean | ✗ not used currently |
| `cover_url` | string | ✗ we use local cover.jpg |
| `chapters` | array | ✗ body is null; we read from json/ folder |
| `volumes` | any | ✗ not used |

### `json/NNNNN.json` (chapter file)

```json
{
  "id": 1,
  "url": "https://...",
  "title": "Chapter 1 - ...",
  "volume": 1,
  "volume_title": "Volume 1",
  "body": "<p>HTML content...</p>",
  "images": [],
  "success": true
}
```

---

## Output Contract

**Target directory**: `public/novels/<slug>/`

```
public/novels/dual-cultivation/
├── info.json
├── metadata.json
├── cover.jpg
├── vol-001.json.br
├── vol-002.json.br
└── ...vol-NNN.json.br
```

### `info.json`

```json
{
  "id": "dual-cultivation",
  "title": "Dual Cultivation",
  "authors": ["Mylittlebrother"],
  "synopsis": "Plain text synopsis stripped from HTML...",
  "genres": ["tag1", "tag2"],
  "source": "allnovelfull-com",
  "sourceUrl": "https://allnovelfull.com/dual-cultivation-novel.html",
  "totalChapters": 1146,
  "bundleSize": 200,
  "bundles": [
    {
      "id": 1,
      "range": "1-200",
      "file": "vol-001.json.br",
      "chapters": 200,
      "sizeKB": 352
    }
  ]
}
```

### `metadata.json`

Generated using same logic as `scripts/generate-metadata.mjs`:

```json
{
  "slug": "dual-cultivation",
  "title": "Dual Cultivation",
  "description": "Read Dual Cultivation online. 1146 chapters available.",
  "author": "Mylittlebrother",
  "coverImage": "/novels/dual-cultivation/cover.jpg",
  "totalChapters": 1146,
  "publishDate": "2020-01-01",
  "language": "en",
  "volumes": [
    {
      "id": 1,
      "file": "vol-001.json.br",
      "chapterRange": [1, 200]
    }
  ]
}
```

**Notes**:
- `author` field uses first entry from `authors[]` (improvement over existing `generate-metadata.mjs` which hardcodes "Unknown"). Falls back to "Unknown" if `authors` is empty.
- `language` uses value from `meta.json` if available, defaults to "en".
- `publishDate` is hardcoded to `"2020-01-01"` — raw data has no publish date field.

### `vol-NNN.json.br` (Brotli-compressed bundle)

Decompressed content:

```json
{
  "bundleId": 1,
  "range": "1-200",
  "novelSlug": "dual-cultivation",
  "chapters": [
    {
      "id": 1,
      "title": "Chapter 1 - ...",
      "url": "https://...",
      "volume": 1,
      "volumeTitle": "Volume 1",
      "body": "<p>HTML content...</p>"
    }
  ]
}
```

**Field transformations from raw chapter**:
- `volume_title` → `volumeTitle` (camelCase)
- `images` → dropped
- `success` → dropped

### `public/novels/index.json` update

New entry appended to `novels[]` array:

```json
{
  "id": "dual-cultivation",
  "title": "Dual Cultivation",
  "slug": "dual-cultivation",
  "cover": "/novels/dual-cultivation/cover.jpg",
  "totalChapters": 1146,
  "bundles": 6,
  "bundleSize": 200,
  "source": "allnovelfull-com",
  "sourceUrl": "https://allnovelfull.com/dual-cultivation-novel.html",
  "lastUpdated": "2026-05-19",
  "authors": ["Mylittlebrother"],
  "synopsis": "Plain text synopsis...",
  "genres": ["tag1", "tag2"]
}
```

If slug already exists in index → replace entry (idempotent).

---

## Processing Logic

### 1. Slug Generation

```
title → lowercase → replace non-alphanumeric with hyphens → collapse multiple hyphens → trim leading/trailing hyphens
```

Examples:
- `"Dual Cultivation"` → `"dual-cultivation"`
- `"God And Devil World"` → `"god-and-devil-world"`
- `"I Have A Super Usb Drive"` → `"i-have-a-super-usb-drive"`

### 2. Source Extraction

Extract domain from `novel.url`, replace dots with hyphens:
- `"https://allnovelfull.com/..."` → `"allnovelfull-com"`
- `"https://www.wuxiaworld.com/..."` → `"wuxiaworld-com"` (strip `www.`)

### 3. Synopsis Stripping

Remove HTML tags from `novel.synopsis`:
- Strip `<p>`, `</p>`, `<br>`, etc.
- Decode basic HTML entities (`&amp;` → `&`, `&lt;` → `<`, etc.)
- Trim whitespace

### 4. Chapter Reading & Filtering

- Read all `json/*.json` files
- Sort numerically by filename (not by `id` field — filename is authoritative order)
- **Filter**: only include chapters where `success === true` AND `body` is non-null/non-empty
- Log warning for skipped chapters

### 5. Bundling

- Chunk size: **200 valid chapters** per bundle
- Bundle numbering: 1-indexed, zero-padded to 3 digits (`vol-001`, `vol-002`, ...)
- Range format: `"firstId-lastId"` using the actual `id` field of the first and last chapter in the bundle (e.g., if chapters 1-49 and 51-201 are valid, range = `"1-201"`)
- Brotli compression: `zlib.brotliCompressSync(buffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6 } })`
- Record `sizeKB`: `Math.round(compressedBuffer.length / 1024)`

### 6. File Generation Order

1. Create output directory `public/novels/<slug>/`
2. Write `vol-NNN.json.br` bundles
3. Write `info.json`
4. Write `metadata.json` (note: `publishDate` hardcoded to `"2020-01-01"` — raw data has no publish date)
5. Copy `cover.jpg`
6. Update `public/novels/index.json` (preserve existing `version` field; update `generated` to current ISO timestamp)

---

## CLI Interface

```bash
# Migrate all novels in public/raw/
node scripts/migrate-raw.mjs

# Migrate specific novel by folder name
node scripts/migrate-raw.mjs "Dual Cultivation"

# npm script
npm run migrate
npm run migrate -- "Dual Cultivation"
```

### Console Output

```
🔍 Found 1 novel(s) to migrate...

📖 Migrating: Dual Cultivation → dual-cultivation
   ├─ Chapters: 1146 (0 skipped)
   ├─ Bundles: 6 × 200 chapters (last: 146)
   ├─ vol-001.json.br (352 KB)
   ├─ vol-002.json.br (299 KB)
   ├─ vol-003.json.br (298 KB)
   ├─ vol-004.json.br (281 KB)
   ├─ vol-005.json.br (284 KB)
   ├─ vol-006.json.br (219 KB)
   ├─ info.json ✓
   ├─ metadata.json ✓
   ├─ cover.jpg ✓
   └─ index.json updated ✓

✅ Migration complete: 1 novel(s) processed.
```

### Exit Codes

- `0` — all novels migrated successfully (warnings are OK)
- `1` — at least one novel failed completely (missing meta.json, zero valid chapters, etc.)

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Novel folder missing `meta.json` | Skip novel, log error, continue |
| `meta.json` missing `novel` key | Skip novel, log error, continue |
| Chapter file unparseable (invalid JSON) | Skip chapter, log warning, continue |
| Chapter with `success: false` | Skip chapter, log warning, continue |
| Chapter with null/empty `body` | Skip chapter, log warning, continue |
| Zero valid chapters after filtering | Fail novel, log error, continue to next |
| Output directory already exists | Overwrite all files (idempotent) |
| `cover.jpg` missing in raw | Skip copy, log warning (novel still migrates) |
| `public/novels/index.json` missing | Create new one with `version: "1.0"` and current `generated` timestamp |

---

## npm Script Addition

```json
{
  "scripts": {
    "migrate": "node scripts/migrate-raw.mjs"
  }
}
```

---

## Verification Criteria

After running `node scripts/migrate-raw.mjs "Dual Cultivation"`:

1. `public/novels/dual-cultivation/` exists with all expected files
2. Each `vol-NNN.json.br` decompresses to valid JSON matching bundle schema
3. Total chapters across all bundles = `totalChapters` in info.json
4. `info.json` fields match raw `meta.json` data
5. `metadata.json` matches `generate-metadata.mjs` output format
6. `index.json` contains the novel entry
7. `npm run build` passes (Astro can discover and render the novel)
