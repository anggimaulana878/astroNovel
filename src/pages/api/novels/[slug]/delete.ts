import type { APIRoute } from 'astro';
import { join } from 'path';
import { readdir, readFile } from 'fs/promises';

export const prerender = false;

export const SLUG_REGEX = /^[a-z0-9-]{1,100}$/;

const PROJECT_ROOT = process.cwd();
const NOVELS_DIR = join(PROJECT_ROOT, 'public/novels');

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const METHOD_NOT_ALLOWED = json(
  { error: 'Method not allowed. Use DELETE.' },
  405,
);

export const GET: APIRoute = async () => METHOD_NOT_ALLOWED;
export const POST: APIRoute = async () => METHOD_NOT_ALLOWED;
export const PUT: APIRoute = async () => METHOD_NOT_ALLOWED;

interface IndexEntry {
  slug: string;
  title: string;
  totalChapters: number;
  [key: string]: unknown;
}

interface IndexFile {
  novels: IndexEntry[];
}

interface Metadata {
  slug?: string;
  title?: string;
  totalChapters?: number;
  volumes?: unknown[];
}

export const DELETE: APIRoute = async ({ params }) => {
  const { slug } = params;

  if (!slug || !SLUG_REGEX.test(slug)) {
    return json(
      {
        error: `Invalid slug format. Must match ${SLUG_REGEX.source} (max 100 chars, lowercase alphanumeric + hyphens).`,
      },
      400,
    );
  }

  // 1. Check novel exists in index
  let index: IndexFile;
  try {
    const raw = await readFile(join(NOVELS_DIR, 'index.json'), 'utf-8');
    index = JSON.parse(raw) as IndexFile;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: `Failed to read novel index: ${message}` }, 500);
  }

  const entry = index.novels.find((n) => n.slug === slug);
  if (!entry) {
    return json({ error: `Novel "${slug}" not found in index.` }, 404);
  }

  // 2. Read metadata
  const novelDir = join(NOVELS_DIR, slug);
  let metadata: Metadata = {};
  try {
    const raw = await readFile(join(novelDir, 'metadata.json'), 'utf-8');
    metadata = JSON.parse(raw) as Metadata;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: `Failed to read metadata for "${slug}": ${message}` }, 500);
  }

  // 3. List files
  let files: string[];
  try {
    const entries = await readdir(novelDir);
    files = entries.map((f) => `public/novels/${slug}/${f}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: `Failed to list files for "${slug}": ${message}` }, 500);
  }

  return json({
    novel: {
      slug,
      title: metadata.title ?? entry.title,
      totalChapters: metadata.totalChapters ?? entry.totalChapters,
      volumes: metadata.volumes?.length ?? 0,
    },
    files,
    command: `npm run delete-novel ${slug}`,
  });
};
