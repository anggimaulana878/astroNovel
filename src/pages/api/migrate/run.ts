import type { APIRoute } from 'astro';
import { join } from 'path';
import { pathToFileURL } from 'url';

export const prerender = false;

interface MigrateSource {
  folder: string;
  title?: string;
  resolvedPath?: string;
}

interface MigrateRequest {
  sources: MigrateSource[];
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json() as MigrateRequest;
  const { sources } = body;

  if (!sources || sources.length === 0) {
    return new Response(JSON.stringify({ success: 0, failures: 0, logs: ['No sources provided'] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const PROJECT_ROOT = process.cwd();
  const RAW_BASE = join(PROJECT_ROOT, 'public/raw');
  const NOVELS_DIR = join(PROJECT_ROOT, 'public/novels');
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  const scriptPath = join(PROJECT_ROOT, 'scripts/migrate-raw.mjs');
  const { migrateNovel, updateIndex } = await import(pathToFileURL(scriptPath).href);

  const indexEntries: unknown[] = [];
  let failures = 0;

  for (const src of sources) {
    const rawDir = src.resolvedPath || join(RAW_BASE, src.folder);
    try {
      log(`📖 Migrating: ${src.title || src.folder}...`);

      const origLog = console.log;
      const origErr = console.error;
      console.log = (...args: unknown[]) => log(args.join(' '));
      console.error = (...args: unknown[]) => log(`❌ ${args.join(' ')}`);

      const entry = await migrateNovel(rawDir, NOVELS_DIR);
      indexEntries.push(entry);

      console.log = origLog;
      console.error = origErr;
      log(`✅ ${src.title || src.folder} migrated successfully`);
    } catch (err) {
      const origLog = console.log;
      const origErr = console.error;
      console.log = origLog;
      console.error = origErr;
      const message = err instanceof Error ? err.message : 'Unknown error';
      log(`❌ Failed: ${src.title || src.folder} — ${message}`);
      failures++;
    }
  }

  if (indexEntries.length > 0) {
    await updateIndex(NOVELS_DIR, indexEntries);
    log(`📋 index.json updated with ${indexEntries.length} novel(s)`);
  }

  return new Response(JSON.stringify({ success: indexEntries.length, failures, logs }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
