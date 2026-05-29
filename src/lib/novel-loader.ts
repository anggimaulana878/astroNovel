import { readFile } from 'node:fs/promises';
import { brotliDecompressSync } from 'node:zlib';
import { join } from 'node:path';
import type { NovelMetadata, VolumeData, Chapter } from '../types/novel';

const cache = new Map<string, any>();
const MAX_CACHE_SIZE = 100;

function limitCacheSize() {
  if (cache.size > MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(cache.keys()).slice(0, cache.size - MAX_CACHE_SIZE);
    keysToDelete.forEach(key => cache.delete(key));
  }
}

export async function loadNovelMetadata(slug: string): Promise<NovelMetadata> {
  const cacheKey = `metadata:${slug}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  try {
    const filePath = join(process.cwd(), 'public', 'novels', slug, 'metadata.json');
    const data = JSON.parse(await readFile(filePath, 'utf-8'));
    cache.set(cacheKey, data);
    limitCacheSize();
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
    limitCacheSize();
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
  
  try {
    const indexPath = join(process.cwd(), 'public', 'novels', 'index.json');
    const indexData = JSON.parse(await readFile(indexPath, 'utf-8'));

    const novels: NovelMetadata[] = [];
    for (const novel of indexData.novels) {
      try {
        const metadata = await loadNovelMetadata(novel.slug);
        novels.push(metadata);
      } catch (err) {
        // Skip novels that fail to load
      }
    }

    cache.set(cacheKey, novels);
    limitCacheSize();
    return novels;
  } catch (err) {
    return [];
  }
}
