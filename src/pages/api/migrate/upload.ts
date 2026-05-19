import type { APIRoute } from 'astro';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const folderName = formData.get('folderName') as string;

  if (!folderName) {
    return new Response(JSON.stringify({ error: 'Missing folder name' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const RAW_BASE = join(process.cwd(), 'public/raw');
  const targetDir = join(RAW_BASE, folderName);

  const files = formData.getAll('files') as File[];
  const paths = formData.getAll('paths') as string[];

  if (files.length === 0) {
    return new Response(JSON.stringify({ error: 'No files received' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await mkdir(targetDir, { recursive: true });
  await mkdir(join(targetDir, 'json'), { recursive: true });

  let metaFound = false;
  let chapterCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = paths[i];

    if (!relativePath) continue;

    const filePath = join(targetDir, relativePath);
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    await mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    if (relativePath === 'meta.json') metaFound = true;
    if (relativePath.endsWith('.json') && relativePath !== 'meta.json') chapterCount++;
  }

  if (!metaFound) {
    return new Response(JSON.stringify({ error: 'meta.json not found in selected folder' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    uploaded: true,
    folder: folderName,
    path: targetDir,
    files: files.length,
    chapters: chapterCount,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
