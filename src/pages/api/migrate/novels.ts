import type { APIRoute } from 'astro';
import { readdir, readFile, access } from 'fs/promises';
import { join } from 'path';

export const prerender = false;

interface RawNovelEntry {
  folder: string;
  title: string;
  authors: string[];
  chapters: number;
  source: string;
}

export const GET: APIRoute = async () => {
  const RAW_BASE = join(process.cwd(), 'public/raw');
  const novels: RawNovelEntry[] = [];

  try {
    const dirs = await readdir(RAW_BASE);
    for (const d of dirs) {
      try {
        const metaPath = join(RAW_BASE, d, 'meta.json');
        await access(metaPath);
        const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
        const isLegacy = !!meta.novel;
        const novel = isLegacy ? meta.novel : meta;
        if (novel && novel.title) {
          let chapterCount = 0;
          if (isLegacy) {
            try {
              const files = await readdir(join(RAW_BASE, d, 'json'));
              chapterCount = files.filter((f: string) => f.endsWith('.json')).length;
            } catch { }
          } else {
            chapterCount = novel.chapter_count || 0;
          }
          const authors = isLegacy
            ? (novel.authors || [])
            : (novel.authors ? [novel.authors] : []);
          novels.push({
            folder: d,
            title: novel.title,
            authors,
            chapters: chapterCount,
            source: novel.url || '',
          });
        }
      } catch { }
    }
  } catch { }

  return new Response(JSON.stringify(novels), {
    headers: { 'Content-Type': 'application/json' },
  });
};
