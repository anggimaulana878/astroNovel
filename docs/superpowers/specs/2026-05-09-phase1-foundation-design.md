# Phase 1: Foundation & Data Layer - Design Document

**Date**: 2026-05-09  
**Status**: Approved  
**Version**: 1.0

---

## 1. Overview

Personal web novel reader application with batch reading capabilities, server-side rendering for Google Assistant "Read it" compatibility, and localStorage-based progress tracking. No authentication, no database - optimized for Vercel free tier deployment.

**Target User**: Single user (personal use)  
**Novel Collection**: Up to 30 novels  
**Primary Use Case**: Batch reading with flexible size (chapters or word count)

---

## 2. Technology Stack

- **Framework**: Astro 6.3.1
- **Rendering**: Hybrid (static + SSR)
- **Deployment**: Vercel (serverless functions)
- **Data Storage**: Brotli-compressed JSON files
- **State Management**: localStorage (client-side)
- **Styling**: CSS with CSS variables for theming

---

## 3. Architecture

### 3.1 Rendering Strategy

**Static Pages (Prerendered at Build)**:
- Homepage (`/`)
- Novel detail pages (`/novels/[slug]`)

**SSR Pages (On-demand)**:
- Reader pages (`/novels/[slug]/read`)

**Rationale**: Static pages for fast CDN delivery, SSR for dynamic batch generation based on user preferences.

### 3.2 Astro Configuration

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'static',
  adapter: vercel({
    maxDuration: 8,
    includeFiles: ['public/novels/**/*.br'],
  }),
});
```

**Key Settings**:
- `output: 'static'` - Astro 6 hybrid mode (static by default, opt-out per page)
- `maxDuration: 8` - Vercel free tier limit is 10s, use 8s for safety margin
- `includeFiles` - Bundle Brotli files with serverless functions

---

## 4. Data Structure

### 4.1 Directory Structure

```
public/novels/
└── super-gene/
    ├── metadata.json          # Novel metadata
    ├── cover.jpg              # Cover image (200x280px recommended)
    ├── vol-001.json.br        # Chapters 1-200 (Brotli compressed)
    ├── vol-002.json.br        # Chapters 201-400
    └── ...
```

### 4.2 metadata.json Schema

```json
{
  "slug": "super-gene",
  "title": "Super Gene",
  "description": "In the future, humans enter God's Sanctuary where they hunt creatures to gain geno points and evolve...",
  "author": "Twelve Winged Dark Burning Angel",
  "coverImage": "/novels/super-gene/cover.jpg",
  "totalChapters": 4000,
  "publishDate": "2015-01-01",
  "language": "en",
  "volumes": [
    {
      "id": 1,
      "file": "vol-001.json.br",
      "chapterRange": [1, 200]
    },
    {
      "id": 2,
      "file": "vol-002.json.br",
      "chapterRange": [201, 400]
    }
  ]
}
```

### 4.3 Volume File Schema (Decompressed)

```json
{
  "bundleId": 1,
  "range": "1-200",
  "novelSlug": "super-gene",
  "chapters": [
    {
      "id": 1,
      "title": "Chapter 1: Supergene",
      "volume": 1,
      "volumeTitle": "Volume 1",
      "body": "<h1>Chapter 1: Supergene</h1><p>By a stony creek...</p>"
    }
  ]
}
```

**Note**: `body` contains HTML. Will be sanitized for semantic structure.

---

## 5. Brotli Decompression

### 5.1 Implementation Pattern

**Strategy**: Module-level caching with error handling

```typescript
// src/lib/novel-loader.ts
import { readFile } from 'node:fs/promises';
import { brotliDecompressSync } from 'node:zlib';
import { join } from 'node:path';

const cache = new Map<string, any>();

export async function loadNovelMetadata(slug: string) {
  const cacheKey = `metadata:${slug}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  
  const filePath = join(process.cwd(), 'public', 'novels', slug, 'metadata.json');
  const data = JSON.parse(await readFile(filePath, 'utf-8'));
  cache.set(cacheKey, data);
  return data;
}

export async function loadChapters(slug: string, volumeFile: string) {
  const cacheKey = `${slug}:${volumeFile}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  
  try {
    const filePath = join(process.cwd(), 'public', 'novels', slug, volumeFile);
    const compressed = await readFile(filePath);
    const decompressed = brotliDecompressSync(compressed, {
      maxOutputLength: 10 * 1024 * 1024
    });
    const data = JSON.parse(decompressed.toString('utf-8'));
    cache.set(cacheKey, data);
    return data;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error(`Volume file not found: ${volumeFile}`);
    }
    if (err instanceof RangeError) {
      throw new Error(`Volume file too large (decompression bomb): ${volumeFile}`);
    }
    throw err;
  }
}
```

**Key Features**:
- In-memory cache (persists between requests until cold start)
- `maxOutputLength` prevents decompression bombs
- Specific error handling for ENOENT and RangeError
- Synchronous decompression (acceptable for cached data)

---

## 6. Routing & Navigation

### 6.1 URL Structure

| Page | URL | Rendering |
|------|-----|-----------|
| Homepage | `/` | Static |
| Novel Detail | `/novels/super-gene` | Static |
| Reader | `/novels/super-gene/read?start=1&mode=chapters&size=5` | SSR |

### 6.2 Reader Query Parameters

- `start` (required): Starting chapter number
- `mode` (required): `chapters` or `words`
- `size` (required): Batch size
  - `chapters` mode: max 12
  - `words` mode: max 25000

**Example URLs**:
```
/novels/super-gene/read?start=1&mode=chapters&size=5
/novels/super-gene/read?start=42&mode=words&size=10000
```

### 6.3 Navigation Flow

**From Homepage**:
1. Click novel card → `/novels/super-gene`

**From Novel Detail**:
1. Click "Continue Reading" → `/novels/super-gene/read?start={lastChapter}&mode={lastMode}&size={lastSize}`
2. Click "Start from Beginning" → `/novels/super-gene/read?start=1&mode=chapters&size=5`
3. Click chapter (e.g., Chapter 5) → `/novels/super-gene/read?start=5&mode={lastMode}&size={lastSize}`

**From Reader**:
1. Click "Next Batch" → Reload with updated `start` parameter
2. Click "Previous Batch" → Reload with updated `start` parameter
3. Change batch size in toolbar → Reload with new `mode` and `size` parameters

---

## 7. Batch Reading Logic

### 7.1 Chapter-based Batching

```typescript
function getChapterBatch(
  startChapter: number,
  size: number,
  totalChapters: number
): { start: number; end: number } {
  const endChapter = Math.min(startChapter + size - 1, totalChapters);
  return { start: startChapter, end: endChapter };
}
```

**Example**: `start=1, size=5` → chapters 1-5

### 7.2 Word-count Batching

```typescript
function getWordCountBatch(
  startChapter: number,
  targetWords: number,
  chapters: Chapter[]
): { start: number; end: number; wordCount: number } {
  let wordCount = 0;
  let endChapter = startChapter;
  
  for (let i = startChapter - 1; i < chapters.length; i++) {
    const chapterWords = countWords(chapters[i].body);
    if (wordCount + chapterWords > targetWords && wordCount > 0) break;
    wordCount += chapterWords;
    endChapter = i + 1;
  }
  
  return { start: startChapter, end: endChapter, wordCount };
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ');
  return text.trim().split(/\s+/).length;
}
```

**Example**: `start=1, targetWords=10000` → chapters 1-3 (if total ~10k words)

### 7.3 Validation

```typescript
function validateBatchParams(mode: string, size: number): boolean {
  if (mode === 'chapters') {
    return size >= 1 && size <= 12;
  }
  if (mode === 'words') {
    return size >= 1000 && size <= 25000;
  }
  return false;
}
```

---

## 8. Page Designs

### 8.1 Homepage

**Layout**: Card grid with cover images

**Components**:
- Novel cards (200x280px cover + metadata)
- Each card shows:
  - Cover image
  - Title
  - Volume count (e.g., "20 volumes")
  - Chapter count (e.g., "4000 chapters")
  - Last read progress (e.g., "Last read: Ch. 42")

**Actions**:
- Click card → navigate to `/novels/{slug}`

**Rendering**: Static (prerendered at build time)

### 8.2 Novel Detail Page

**Layout**: Hero section + chapter list tabs

**Hero Section**:
- Cover image (200x280px)
- Title, author, description
- Stats: volumes, chapters
- Quick action buttons:
  - "Continue Reading (Ch. 42)" - if progress exists
  - "Start from Beginning"

**Chapter List**:
- Tabs: 1-100, 101-200, 201-300, etc. (100 chapters per tab)
- Grid layout: Chapter cards with number and title
- Click chapter → navigate to reader starting from that chapter

**Rendering**: Static (prerendered at build time)

### 8.3 Reader Page

**Layout**: Sticky header + content + bottom navigation

**Sticky Header**:
- Back button, novel title
- Dark mode toggle (🌙)
- Font size buttons (A-, A+)
- Settings dropdown (⚙️) - line height & reading width presets
- Collapsed batch selector:
  - Shows: "Reading: Chapters 1-5 (5 chapters)"
  - Click "Change Batch" to expand
  - Expanded: Radio (chapters/words) + number input + Apply button

**Content Area**:
- Chapter content (HTML from JSON, sanitized)
- Max width: 800px (adjustable via settings)
- Chapters separated by visual divider
- Each chapter in `<section>` tag with title

**Bottom Navigation**:
- Previous Batch button (disabled if first batch)
- Progress indicator: "Chapters 1-5 of 4000"
- Next Batch button

**Rendering**: SSR (on-demand, `export const prerender = false`)

---

## 9. State Management (localStorage)

### 9.1 Progress Tracking

**Key**: `novel-progress:{slug}`

**Schema**:
```typescript
interface NovelProgress {
  slug: string;
  lastChapter: number;
  lastUpdated: number;
}
```

**Auto-save Strategy**:
- Save every 10 seconds while reading
- Detect current visible chapter via scroll position
- Track first chapter of current batch

**Implementation**:
```typescript
setInterval(() => {
  const currentChapter = getCurrentVisibleChapter();
  saveProgress(novelSlug, currentChapter);
}, 10000);
```

### 9.2 Reader Preferences

**Key**: `reader-preferences`

**Schema**:
```typescript
interface ReaderPreferences {
  darkMode: boolean;
  fontSize: number;
  lineHeight: 'compact' | 'normal' | 'relaxed';
  readingWidth: 'narrow' | 'medium' | 'wide';
  batchMode: 'chapters' | 'words';
  batchSize: number;
}
```

**Defaults**:
```typescript
{
  darkMode: false,  // Detect from system preference on first visit
  fontSize: 16,
  lineHeight: 'normal',
  readingWidth: 'medium',
  batchMode: 'chapters',
  batchSize: 5
}
```

---

## 10. Dark Mode

**Strategy**: Manual toggle with system preference as default

**Implementation**:
```typescript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const savedMode = localStorage.getItem('darkMode');
const darkMode = savedMode !== null ? savedMode === 'true' : prefersDark;

document.documentElement.classList.toggle('dark', darkMode);

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', String(isDark));
}
```

**CSS Variables**:
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --border: #e0e0e0;
  --accent: #3b82f6;
}

.dark {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2a2a2a;
  --text-primary: #e0e0e0;
  --border: #404040;
  --accent: #60a5fa;
}
```

---

## 11. Reading Settings

**Controls**:
1. **Font Size**: A- / A+ buttons in toolbar (14-24px range)
2. **Line Height**: Dropdown presets (Compact 1.5 / Normal 1.8 / Relaxed 2.0)
3. **Reading Width**: Dropdown presets (Narrow 600px / Medium 800px / Wide 1000px)

**UI**: Click ⚙️ button to open dropdown menu with presets

**Persistence**: Save to `reader-preferences` in localStorage

---

## 12. Google Assistant "Read It" Compatibility

### 12.1 Requirements Checklist

✅ **Server-Side Rendering**: Reader page uses SSR  
✅ **Semantic HTML**: `<article>`, `<section>`, `<p>`, `<h1>`-`<h6>`  
✅ **JSON-LD Schema**: Complete Article schema with required fields  
✅ **Meta Tags**: Robots, Open Graph, article metadata  
✅ **Content Length**: Minimum 500 words per batch  
✅ **Language Attribute**: `lang="en"` on html and article  
✅ **HTTPS**: Automatic via Vercel  
✅ **Robots.txt**: Allow all pages  
✅ **Sitemap.xml**: Generated for all reader pages  

### 12.2 HTML Structure

```astro
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="index, follow" />
  <meta name="googlebot" content="index, follow" />
  
  <meta property="og:title" content="{novelTitle} - Chapters {start}-{end}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="{url}" />
  
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "{novelTitle} - Chapters {start}-{end}",
    "author": {
      "@type": "Person",
      "name": "{author}"
    },
    "datePublished": "{publishDate}",
    "dateModified": "{new Date().toISOString()}",
    "inLanguage": "en",
    "isAccessibleForFree": true,
    "publisher": {
      "@type": "Organization",
      "name": "AstroNovel"
    },
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["article[role='main']", "section[itemprop='articleBody']"]
    }
  }
  </script>
  
  <title>{novelTitle} - Chapters {start}-{end}</title>
</head>
<body>
  <article role="main" itemscope itemtype="https://schema.org/Article" lang="en">
    <header>
      <h1 itemprop="headline">{novelTitle} - Chapters {start}-{end}</h1>
      <meta itemprop="inLanguage" content="en" />
    </header>
    
    {chapters.map(chapter => (
      <section itemprop="articleBody">
        <h2>{chapter.title}</h2>
        <div set:html={sanitizeChapterHTML(chapter.body)} />
      </section>
    ))}
  </article>
</body>
</html>
```

### 12.3 HTML Sanitization

```typescript
// src/lib/html-sanitizer.ts
export function sanitizeChapterHTML(html: string): string {
  let sanitized = html.replace(/<div>(.*?)<\/div>/g, '<p>$1</p>');
  sanitized = sanitized.replace(/style="[^"]*"/g, '');
  sanitized = sanitized.replace(/<p>\s*<\/p>/g, '');
  return sanitized;
}
```

**Purpose**: Convert non-semantic HTML (divs) to semantic tags (paragraphs)

### 12.4 Content Validation

```typescript
function validateBatchForAssistant(chapters: Chapter[]): boolean {
  const totalWords = chapters.reduce((sum, ch) => sum + countWords(ch.body), 0);
  
  if (totalWords < 500) {
    console.warn(`Batch too short: ${totalWords} words. Google Assistant may not work.`);
    return false;
  }
  
  return true;
}
```

### 12.5 Robots.txt

```
User-agent: *
Allow: /
Allow: /novels/
Allow: /novels/*/read

Sitemap: https://your-domain.com/sitemap.xml
```

### 12.6 Sitemap Generation

```typescript
// src/pages/sitemap.xml.ts
export async function GET() {
  const novels = await getAllNovels();
  
  const urls = novels.flatMap(novel => {
    const batches = Math.ceil(novel.totalChapters / 5);
    return Array.from({ length: batches }, (_, i) => {
      const start = i * 5 + 1;
      return `
  <url>
    <loc>https://your-domain.com/novels/${novel.slug}/read?start=${start}&mode=chapters&size=5</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
  });
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('\n')}
</urlset>`;
  
  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml' }
  });
}
```

---

## 13. File Organization

```
astroNovel/
├── public/
│   ├── novels/
│   │   └── super-gene/
│   │       ├── metadata.json
│   │       ├── cover.jpg
│   │       └── vol-*.json.br
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── NovelCard.astro
│   │   ├── ChapterList.astro
│   │   ├── ReaderToolbar.astro
│   │   ├── BatchSelector.astro
│   │   └── BatchNavigation.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   ├── novel-loader.ts
│   │   ├── batch-calculator.ts
│   │   ├── progress-tracker.ts
│   │   └── html-sanitizer.ts
│   └── pages/
│       ├── index.astro
│       ├── sitemap.xml.ts
│       └── novels/
│           └── [slug]/
│               ├── index.astro
│               └── read.astro
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-09-phase1-foundation-design.md
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## 14. Deployment

### 14.1 Vercel Configuration

**Build Settings**:
- Build command: `npm run build`
- Output directory: `dist`
- Node.js version: 22.x

**Environment Variables**: None required

**Deployment Flow**:
1. Push to GitHub
2. Vercel auto-detects Astro project
3. Builds static pages → CDN
4. Builds SSR pages → Serverless functions
5. Deploys with HTTPS

### 14.2 Performance Expectations

- **Static pages**: Instant (CDN)
- **SSR pages**: ~200-500ms (cold start + decompression)
- **Cached SSR**: ~50-100ms (warm function)

### 14.3 Vercel Free Tier Limits

| Resource | Limit | Usage |
|----------|-------|-------|
| Function timeout | 10s | Using 8s max |
| Function memory | 512 MB | Brotli decompression fits easily |
| Concurrent functions | 12 | Sufficient for personal use |
| Bandwidth | 100 GB/month | Typical for small sites |

---

## 15. Testing Strategy

### 15.1 Google Assistant Testing

1. **Rich Results Test**:
   - URL: `https://search.google.com/test/rich-results`
   - Verify Article schema detected
   - Check for errors/warnings

2. **Mobile Test**:
   - Open reader page on Android Chrome
   - Activate Google Assistant
   - Say "Read it" or "Baca halaman ini"
   - Verify content is read aloud

3. **View Source Test**:
   - Right-click → View Page Source
   - Search for chapter text in HTML
   - If found → SSR working ✅
   - If not found → Content is JS-rendered ❌

### 15.2 Functional Testing

- [ ] Homepage loads and displays novels
- [ ] Novel detail page shows chapter list tabs
- [ ] Reader page loads with correct batch
- [ ] Batch navigation (prev/next) works
- [ ] Batch size adjustment works
- [ ] Dark mode toggle persists
- [ ] Reading settings persist
- [ ] Progress tracking saves correctly
- [ ] "Continue Reading" resumes from last chapter

### 15.3 Performance Testing

- [ ] Static pages load < 1s
- [ ] SSR pages load < 2s (cold start)
- [ ] Brotli decompression < 100ms
- [ ] No memory leaks in long reading sessions

---

## 16. Success Criteria

Phase 1 is complete when:

✅ Homepage displays novel collection with covers  
✅ Novel detail page shows chapter list in tabs  
✅ Reader page renders batches server-side  
✅ Batch navigation works (prev/next)  
✅ Batch size adjustment works (chapters/words)  
✅ Dark mode works with system preference default  
✅ Reading settings work (font, line height, width)  
✅ Progress tracking saves and resumes  
✅ Google Assistant "Read it" works on reader pages  
✅ Deployed to Vercel with HTTPS  
✅ All tests pass  

---

## 17. Out of Scope (Future Phases)

**Phase 2**: Enhanced reading features
- Volume-based navigation
- Bookmarks
- Reading statistics

**Phase 3**: Multi-novel features
- Search across novels
- Reading history
- Favorites

**Phase 4**: Advanced features
- Offline reading (PWA)
- Text-to-speech (built-in)
- Reading themes

---

## 18. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Brotli decompression slow | Poor UX | Module-level caching |
| Vercel function timeout | Reader fails | Limit batch size, optimize decompression |
| Google Assistant not working | Core feature broken | Follow all compatibility requirements, test early |
| localStorage data loss | Progress lost | Document backup/export in future phase |

---

## 19. Dependencies

**Runtime**:
- Astro 6.3.1
- Node.js 22.x
- Vercel serverless functions

**Build**:
- No external dependencies for core functionality
- Native Node.js modules only (fs, zlib, path)

---

## 20. Approval

**Design Approved By**: User  
**Date**: 2026-05-09  
**Next Step**: Write implementation plan (via writing-plans skill)

---

*End of Design Document*
