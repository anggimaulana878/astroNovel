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
  
  try {
    const indexPath = join(process.cwd(), 'public', 'novels', 'index.json');
    const indexData = JSON.parse(await readFile(indexPath, 'utf-8'));
    
    const novels: NovelMetadata[] = [];
    for (const novel of indexData.novels) {
      try {
        const metadata = await loadNovelMetadata(novel.slug);
        novels.push(metadata);
      } catch (err) {
        console.warn(`Failed to load novel ${novel.slug}:`, err);
      }
    }
    
    cache.set(cacheKey, novels);
    return novels;
  } catch (err) {
    console.error('Failed to load novels index:', err);
    return [];
  }
}
