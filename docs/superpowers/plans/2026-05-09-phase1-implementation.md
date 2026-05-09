# Phase 1: Foundation & Data Layer - Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal web novel reader with batch reading, SSR for Google Assistant compatibility, and localStorage-based progress tracking.

**Architecture:** Astro 6.3.1 hybrid rendering (static homepage/detail pages, SSR reader pages), Brotli-compressed JSON data, Vercel serverless deployment.

**Tech Stack:** Astro 6.3.1, Node.js 22.x, native zlib for Brotli, CSS variables for theming, localStorage for state.

**Spec Reference:** `docs/superpowers/specs/2026-05-09-phase1-foundation-design.md`

---

## Chunk 1: Project Setup & Configuration

### Task 1: Install Vercel Adapter

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Install @astrojs/vercel package**

```bash
npm install @astrojs/vercel
```

Expected: Package added to dependencies

- [ ] **Step 2: Update astro.config.mjs**

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

- [ ] **Step 3: Verify configuration**

```bash
npm run build
```

Expected: Build succeeds, creates `.vercel/output` directory

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json astro.config.mjs
git commit -m "feat: add Vercel adapter with serverless configuration"
```

---

### Task 2: Create Novel Metadata Structure

**Files:**
- Create: `public/novels/super-gene/metadata.json`
- Create: `public/robots.txt`

- [ ] **Step 1: Create metadata.json for super-gene**

```json
{
  "slug": "super-gene",
  "title": "Super Gene",
  "description": "In the future, humans enter God's Sanctuary where they hunt creatures to gain geno points and evolve. Han Sen, a young man, enters the sanctuary and begins his journey to become the strongest.",
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
    },
    {
      "id": 3,
      "file": "vol-003.json.br",
      "chapterRange": [401, 600]
    },
    {
      "id": 4,
      "file": "vol-004.json.br",
      "chapterRange": [601, 800]
    },
    {
      "id": 5,
      "file": "vol-005.json.br",
      "chapterRange": [801, 1000]
    },
    {
      "id": 6,
      "file": "vol-006.json.br",
      "chapterRange": [1001, 1200]
    },
    {
      "id": 7,
      "file": "vol-007.json.br",
      "chapterRange": [1201, 1400]
    },
    {
      "id": 8,
      "file": "vol-008.json.br",
      "chapterRange": [1401, 1600]
    },
    {
      "id": 9,
      "file": "vol-009.json.br",
      "chapterRange": [1601, 1800]
    },
    {
      "id": 10,
      "file": "vol-010.json.br",
      "chapterRange": [1801, 2000]
    },
    {
      "id": 11,
      "file": "vol-011.json.br",
      "chapterRange": [2001, 2200]
    },
    {
      "id": 12,
      "file": "vol-012.json.br",
      "chapterRange": [2201, 2400]
    },
    {
      "id": 13,
      "file": "vol-013.json.br",
      "chapterRange": [2401, 2600]
    },
    {
      "id": 14,
      "file": "vol-014.json.br",
      "chapterRange": [2601, 2800]
    },
    {
      "id": 15,
      "file": "vol-015.json.br",
      "chapterRange": [2801, 3000]
    },
    {
      "id": 16,
      "file": "vol-016.json.br",
      "chapterRange": [3001, 3200]
    },
    {
      "id": 17,
      "file": "vol-017.json.br",
      "chapterRange": [3201, 3400]
    },
    {
      "id": 18,
      "file": "vol-018.json.br",
      "chapterRange": [3401, 3600]
    },
    {
      "id": 19,
      "file": "vol-019.json.br",
      "chapterRange": [3601, 3800]
    },
    {
      "id": 20,
      "file": "vol-020.json.br",
      "chapterRange": [3801, 4000]
    }
  ]
}
```

- [ ] **Step 2: Create robots.txt**

```
User-agent: *
Allow: /
Allow: /novels/
Allow: /novels/*/read

Sitemap: https://your-domain.vercel.app/sitemap.xml
```

- [ ] **Step 3: Verify files exist**

```bash
ls -la public/novels/super-gene/metadata.json
ls -la public/robots.txt
```

Expected: Both files exist

- [ ] **Step 4: Commit**

```bash
git add public/novels/super-gene/metadata.json public/robots.txt
git commit -m "feat: add novel metadata structure and robots.txt"
```

---

### Task 3: Create TypeScript Types

**Files:**
- Create: `src/types/novel.ts`

- [ ] **Step 1: Create novel types**

```typescript
// src/types/novel.ts

export interface NovelMetadata {
  slug: string;
  title: string;
  description: string;
  author: string;
  coverImage: string;
  totalChapters: number;
  publishDate: string;
  language: string;
  volumes: VolumeInfo[];
}

export interface VolumeInfo {
  id: number;
  file: string;
  chapterRange: [number, number];
}

export interface VolumeData {
  bundleId: number;
  range: string;
  novelSlug: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: number;
  title: string;
  volume: number;
  volumeTitle: string;
  body: string;
  url?: string;
}

export interface NovelProgress {
  slug: string;
  lastChapter: number;
  lastUpdated: number;
}

export interface ReaderPreferences {
  darkMode: boolean;
  fontSize: number;
  lineHeight: 'compact' | 'normal' | 'relaxed';
  readingWidth: 'narrow' | 'medium' | 'wide';
  batchMode: 'chapters' | 'words';
  batchSize: number;
}

export interface BatchResult {
  start: number;
  end: number;
  chapters: Chapter[];
  wordCount?: number;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/novel.ts
git commit -m "feat: add TypeScript types for novel data structures"
```

---

## Chunk 2: Core Utilities

### Task 4: Implement Brotli Decompression Utilities

**Files:**
- Create: `src/lib/novel-loader.ts`

- [ ] **Step 1: Create novel-loader.ts with caching**

```typescript
// src/lib/novel-loader.ts
import { readFile } from 'node:fs/promises';
import { brotliDecompressSync } from 'node:zlib';
import { join } from 'node:path';
import type { NovelMetadata, VolumeData, Chapter } from '../types/novel';

const cache = new Map<string, any>();

export async function loadNovelMetadata(slug: string): Promise<NovelMetadata> {
  const cacheKey = `metadata:${slug}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  try {
    const filePath = join(process.cwd(), 'public', 'novels', slug, 'metadata.json');
    const data = JSON.parse(await readFile(filePath, 'utf-8'));
    cache.set(cacheKey, data);
    return data;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error(`Novel not found: ${slug}`);
    }
    throw err;
  }
}

export async function loadVolumeData(slug: string, volumeFile: string): Promise<VolumeData> {
  const cacheKey = `${slug}:${volumeFile}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  try {
    const filePath = join(process.cwd(), 'public', 'novels', slug, volumeFile);
    const compressed = await readFile(filePath);
    const decompressed = brotliDecompressSync(compressed, {
      maxOutputLength: 10 * 1024 * 1024
    });
    const data: VolumeData = JSON.parse(decompressed.toString('utf-8'));
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

export async function loadChapterRange(
  slug: string,
  startChapter: number,
  endChapter: number
): Promise<Chapter[]> {
  const metadata = await loadNovelMetadata(slug);
  const chapters: Chapter[] = [];
  
  for (const volume of metadata.volumes) {
    const [volStart, volEnd] = volume.chapterRange;
    
    if (endChapter < volStart || startChapter > volEnd) {
      continue;
    }
    
    const volumeData = await loadVolumeData(slug, volume.file);
    
    for (const chapter of volumeData.chapters) {
      if (chapter.id >= startChapter && chapter.id <= endChapter) {
        chapters.push(chapter);
      }
    }
  }
  
  return chapters.sort((a, b) => a.id - b.id);
}

export async function getAllNovels(): Promise<NovelMetadata[]> {
  const cacheKey = 'all-novels';
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const novels = [await loadNovelMetadata('super-gene')];
  cache.set(cacheKey, novels);
  return novels;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/novel-loader.ts
git commit -m "feat: implement Brotli decompression with caching"
```

---

### Task 5: Implement Batch Calculation Logic

**Files:**
- Create: `src/lib/batch-calculator.ts`

- [ ] **Step 1: Create batch-calculator.ts**

```typescript
// src/lib/batch-calculator.ts
import type { Chapter, BatchResult } from '../types/novel';

export function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ');
  return text.trim().split(/\s+/).length;
}

export function getChapterBatch(
  startChapter: number,
  size: number,
  totalChapters: number
): { start: number; end: number } {
  const endChapter = Math.min(startChapter + size - 1, totalChapters);
  return { start: startChapter, end: endChapter };
}

export function getWordCountBatch(
  startChapter: number,
  targetWords: number,
  chapters: Chapter[]
): { start: number; end: number; wordCount: number } {
  let wordCount = 0;
  let endChapter = startChapter;
  
  for (let i = startChapter - 1; i < chapters.length; i++) {
    const chapterWords = countWords(chapters[i].body);
    if (wordCount + chapterWords > targetWords && wordCount > 0) {
      break;
    }
    wordCount += chapterWords;
    endChapter = i + 1;
  }
  
  return { start: startChapter, end: endChapter, wordCount };
}

export function validateBatchParams(mode: string, size: number): boolean {
  if (mode === 'chapters') {
    return size >= 1 && size <= 12;
  }
  if (mode === 'words') {
    return size >= 1000 && size <= 25000;
  }
  return false;
}

export function validateBatchForAssistant(chapters: Chapter[]): boolean {
  const totalWords = chapters.reduce((sum, ch) => sum + countWords(ch.body), 0);
  
  if (totalWords < 500) {
    console.warn(`Batch too short: ${totalWords} words. Google Assistant may not work.`);
    return false;
  }
  
  return true;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/batch-calculator.ts
git commit -m "feat: implement batch calculation logic"
```

---

### Task 6: Implement HTML Sanitizer

**Files:**
- Create: `src/lib/html-sanitizer.ts`

- [ ] **Step 1: Create html-sanitizer.ts**

```typescript
// src/lib/html-sanitizer.ts

export function sanitizeChapterHTML(html: string): string {
  let sanitized = html;
  
  sanitized = sanitized.replace(/<div>(.*?)<\/div>/g, '<p>$1</p>');
  
  sanitized = sanitized.replace(/style="[^"]*"/g, '');
  
  sanitized = sanitized.replace(/<p>\s*<\/p>/g, '');
  
  return sanitized;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/html-sanitizer.ts
git commit -m "feat: implement HTML sanitizer for semantic structure"
```

---

## Chunk 3: Base Layout & Styling

### Task 7: Create Base Layout with Dark Mode

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Create BaseLayout.astro**

```astro
---
// src/layouts/BaseLayout.astro
interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="index, follow" />
  <meta name="googlebot" content="index, follow" />
  
  {description && <meta name="description" content={description} />}
  
  <title>{title}</title>
  
  <style is:global>
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f5f5f5;
      --text-primary: #1a1a1a;
      --text-secondary: #666666;
      --border: #e0e0e0;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
    }

    .dark {
      --bg-primary: #1a1a1a;
      --bg-secondary: #2a2a2a;
      --text-primary: #e0e0e0;
      --text-secondary: #a0a0a0;
      --border: #404040;
      --accent: #60a5fa;
      --accent-hover: #3b82f6;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      transition: background-color 0.3s, color 0.3s;
    }

    a {
      color: var(--accent);
      text-decoration: none;
    }

    a:hover {
      color: var(--accent-hover);
    }

    button {
      font-family: inherit;
      cursor: pointer;
      border: none;
      background: none;
    }

    input, select {
      font-family: inherit;
    }
  </style>

  <script>
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    const darkMode = savedMode !== null ? savedMode === 'true' : prefersDark;
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  </script>
</head>
<body>
  <slot />
</body>
</html>
```

- [ ] **Step 2: Update existing Layout.astro to use BaseLayout**

```astro
---
// src/layouts/Layout.astro
import BaseLayout from './BaseLayout.astro';

interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
---

<BaseLayout title={title} description={description}>
  <slot />
</BaseLayout>
```

- [ ] **Step 3: Verify pages still work**

```bash
npm run dev
```

Expected: Dev server starts, pages load

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro src/layouts/Layout.astro
git commit -m "feat: create base layout with dark mode support"
```

---

## Chunk 4: Homepage

### Task 8: Create Novel Card Component

**Files:**
- Create: `src/components/NovelCard.astro`

- [ ] **Step 1: Create NovelCard.astro**

```astro
---
// src/components/NovelCard.astro
import type { NovelMetadata } from '../types/novel';

interface Props {
  novel: NovelMetadata;
  lastChapter?: number;
}

const { novel, lastChapter } = Astro.props;
---

<a href={`/novels/${novel.slug}`} class="novel-card">
  <div class="cover">
    <img src={novel.coverImage} alt={`${novel.title} cover`} />
  </div>
  <div class="info">
    <h3 class="title">{novel.title}</h3>
    <div class="meta">
      <span>{novel.volumes.length} volumes</span>
      <span>•</span>
      <span>{novel.totalChapters} chapters</span>
    </div>
    {lastChapter && (
      <div class="progress">Last read: Ch. {lastChapter}</div>
    )}
  </div>
</a>

<style>
  .novel-card {
    display: block;
    border: 2px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--bg-primary);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .novel-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .cover {
    width: 100%;
    height: 280px;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .info {
    padding: 16px;
  }

  .title {
    font-size: 1.1em;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary);
  }

  .meta {
    font-size: 0.9em;
    color: var(--text-secondary);
    display: flex;
    gap: 8px;
  }

  .progress {
    margin-top: 8px;
    font-size: 0.85em;
    color: var(--accent);
  }
</style>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/NovelCard.astro
git commit -m "feat: create novel card component"
```

---

### Task 9: Build Homepage

**Files:**
- Modify: `src/pages/index.astro`
- Delete: `src/components/Welcome.astro`

- [ ] **Step 1: Update index.astro**

```astro
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import NovelCard from '../components/NovelCard.astro';
import { getAllNovels } from '../lib/novel-loader';

const novels = await getAllNovels();
---

<Layout title="AstroNovel - My Novel Library" description="Personal web novel reader">
  <main class="container">
    <header class="page-header">
      <h1>My Novel Library</h1>
    </header>
    
    <div class="novel-grid">
      {novels.map(novel => (
        <NovelCard novel={novel} />
      ))}
    </div>
  </main>
</Layout>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .page-header {
    margin-bottom: 32px;
  }

  .page-header h1 {
    font-size: 2em;
    font-weight: 700;
  }

  .novel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 24px;
  }

  @media (max-width: 768px) {
    .novel-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
    }
  }
</style>
```

- [ ] **Step 2: Delete Welcome.astro**

```bash
rm src/components/Welcome.astro
```

- [ ] **Step 3: Test homepage**

```bash
npm run dev
```

Open http://localhost:4321 and verify novel card displays

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git rm src/components/Welcome.astro
git commit -m "feat: build homepage with novel grid"
```

---

*Plan continues in next message due to length...*
## Chunk 5: Novel Detail Page

### Task 10: Create Chapter List Component

**Files:**
- Create: `src/components/ChapterList.astro`

- [ ] **Step 1: Create ChapterList.astro**

```astro
---
// src/components/ChapterList.astro
import type { Chapter } from '../types/novel';

interface Props {
  chapters: Chapter[];
  novelSlug: string;
}

const { chapters, novelSlug } = Astro.props;

const chapterGroups: { label: string; chapters: Chapter[] }[] = [];
for (let i = 0; i < chapters.length; i += 100) {
  const start = i + 1;
  const end = Math.min(i + 100, chapters.length);
  chapterGroups.push({
    label: `${start}-${end}`,
    chapters: chapters.slice(i, i + 100)
  });
}
---

<div class="chapter-list">
  <h3>Chapters</h3>
  
  <div class="tabs">
    {chapterGroups.map((group, index) => (
      <button 
        class={`tab ${index === 0 ? 'active' : ''}`}
        data-tab={index}
      >
        {group.label}
      </button>
    ))}
  </div>
  
  <div class="tab-content">
    {chapterGroups.map((group, index) => (
      <div class={`tab-panel ${index === 0 ? 'active' : ''}`} data-panel={index}>
        <div class="chapter-grid">
          {group.chapters.map(chapter => (
            <a 
              href={`/novels/${novelSlug}/read?start=${chapter.id}&mode=chapters&size=5`}
              class="chapter-item"
            >
              <div class="chapter-number">Chapter {chapter.id}</div>
              <div class="chapter-title">{chapter.title}</div>
            </a>
          ))}
        </div>
      </div>
    ))}
  </div>
</div>

<style>
  .chapter-list {
    margin-top: 32px;
  }

  .chapter-list h3 {
    font-size: 1.5em;
    margin-bottom: 16px;
  }

  .tabs {
    display: flex;
    gap: 8px;
    border-bottom: 2px solid var(--border);
    padding-bottom: 8px;
    margin-bottom: 16px;
    overflow-x: auto;
  }

  .tab {
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    color: var(--text-primary);
    font-size: 0.9em;
    transition: background-color 0.2s, color 0.2s;
  }

  .tab.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .tab:hover:not(.active) {
    background: var(--bg-secondary);
  }

  .tab-panel {
    display: none;
  }

  .tab-panel.active {
    display: block;
  }

  .chapter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  .chapter-item {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px;
    background: var(--bg-primary);
    transition: background-color 0.2s, transform 0.2s;
  }

  .chapter-item:hover {
    background: var(--bg-secondary);
    transform: translateY(-2px);
  }

  .chapter-number {
    font-weight: 600;
    margin-bottom: 4px;
    color: var(--text-primary);
  }

  .chapter-title {
    font-size: 0.85em;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

<script>
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabIndex = tab.getAttribute('data-tab');
      
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      document.querySelector(`[data-panel="${tabIndex}"]`)?.classList.add('active');
    });
  });
</script>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ChapterList.astro
git commit -m "feat: create chapter list component with tabs"
```

---

### Task 11: Build Novel Detail Page

**Files:**
- Create: `src/pages/novels/[slug]/index.astro`

- [ ] **Step 1: Create novel detail page**

```astro
---
// src/pages/novels/[slug]/index.astro
import Layout from '../../../layouts/Layout.astro';
import ChapterList from '../../../components/ChapterList.astro';
import { loadNovelMetadata, loadChapterRange } from '../../../lib/novel-loader';

const { slug } = Astro.params;

if (!slug) {
  return Astro.redirect('/');
}

const novel = await loadNovelMetadata(slug);
const allChapters = await loadChapterRange(slug, 1, novel.totalChapters);
---

<Layout title={`${novel.title} - AstroNovel`} description={novel.description}>
  <main class="container">
    <div class="hero">
      <div class="cover">
        <img src={novel.coverImage} alt={`${novel.title} cover`} />
      </div>
      
      <div class="info">
        <h1>{novel.title}</h1>
        <p class="author">by {novel.author}</p>
        <div class="meta">
          <span>{novel.volumes.length} volumes</span>
          <span>•</span>
          <span>{novel.totalChapters} chapters</span>
        </div>
        <p class="description">{novel.description}</p>
        
        <div class="actions">
          <a href={`/novels/${slug}/read?start=1&mode=chapters&size=5`} class="btn btn-primary">
            Start from Beginning
          </a>
          <a href={`/novels/${slug}/read?start=1&mode=chapters&size=5`} class="btn btn-secondary" id="continue-btn">
            Continue Reading
          </a>
        </div>
      </div>
    </div>
    
    <ChapterList chapters={allChapters} novelSlug={slug} />
  </main>
</Layout>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .hero {
    display: flex;
    gap: 32px;
    padding: 32px;
    background: var(--bg-secondary);
    border-radius: 12px;
    margin-bottom: 40px;
  }

  .cover {
    flex-shrink: 0;
    width: 200px;
    height: 280px;
    border-radius: 8px;
    overflow: hidden;
  }

  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .info {
    flex: 1;
  }

  .info h1 {
    font-size: 2em;
    margin-bottom: 8px;
  }

  .author {
    color: var(--text-secondary);
    margin-bottom: 16px;
  }

  .meta {
    display: flex;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 0.9em;
    margin-bottom: 16px;
  }

  .description {
    line-height: 1.6;
    color: var(--text-secondary);
    margin-bottom: 24px;
  }

  .actions {
    display: flex;
    gap: 12px;
  }

  .btn {
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: 600;
    transition: background-color 0.2s, transform 0.2s;
  }

  .btn-primary {
    background: var(--accent);
    color: white;
  }

  .btn-primary:hover {
    background: var(--accent-hover);
    transform: translateY(-2px);
  }

  .btn-secondary {
    background: transparent;
    color: var(--accent);
    border: 2px solid var(--accent);
  }

  .btn-secondary:hover {
    background: var(--accent);
    color: white;
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    .hero {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>

<script>
  const continueBtn = document.getElementById('continue-btn');
  if (continueBtn) {
    const slug = window.location.pathname.split('/')[2];
    const progressKey = `novel-progress:${slug}`;
    const progress = localStorage.getItem(progressKey);
    
    if (progress) {
      const { lastChapter } = JSON.parse(progress);
      const prefs = JSON.parse(localStorage.getItem('reader-preferences') || '{"batchMode":"chapters","batchSize":5}');
      continueBtn.href = `/novels/${slug}/read?start=${lastChapter}&mode=${prefs.batchMode}&size=${prefs.batchSize}`;
      continueBtn.textContent = `Continue Reading (Ch. ${lastChapter})`;
    }
  }
</script>
```

- [ ] **Step 2: Test novel detail page**

```bash
npm run dev
```

Open http://localhost:4321/novels/super-gene and verify page displays

- [ ] **Step 3: Commit**

```bash
git add src/pages/novels/[slug]/index.astro
git commit -m "feat: build novel detail page with hero and chapter list"
```

---

*Continuing with Reader Page in next section...*
