#!/usr/bin/env node
import { readFile, writeFile, readdir, mkdir, copyFile, access, rm } from 'fs/promises';
import { join, basename } from 'path';
import { brotliCompressSync, constants } from 'zlib';
import { fileURLToPath } from 'url';

// --- Helpers ---

function slugify(title, fallback = '') {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug) return slug;
  if (fallback) {
    return fallback
      .toLowerCase()
      .replace(/\.json$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  return title
    .replace(/[,，。！？\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

function extractSource(url) {
  try {
    const { hostname } = new URL(url);
    return hostname
      .replace(/^www\./, '')
      .replace(/\./g, '-');
  } catch {
    return 'unknown';
  }
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Main ---

async function migrateNovel(rawDir, novelsDir) {
  const folderName = basename(rawDir);

  const metaPath = join(rawDir, 'meta.json');
  const meta = JSON.parse(await readFile(metaPath, 'utf-8'));

  // Auto-detect format
  const isLegacy = !!meta.novel;
  const novel = isLegacy ? meta.novel : meta;

  const title = novel.title;
  if (!title) {
    throw new Error(`meta.json missing title`);
  }

  const slug = slugify(title, folderName);
  const source = extractSource(novel.url || '');
  const synopsis = stripHtml(novel.synopsis || '');
  const authors = isLegacy
    ? (novel.authors?.length ? novel.authors : [])
    : (novel.authors ? [novel.authors] : []);
  const genres = novel.tags || [];
  const language = novel.language || 'en';
  const sourceUrl = novel.url || '';

  console.log(`\n📖 Migrating: ${title} → ${slug}`);

  // Read chapters — detect folder structure
  const chapters = [];
  let skipped = 0;

  if (isLegacy) {
    // Legacy format: json/ folder with body field
    const jsonDir = join(rawDir, 'json');
    const chapterFiles = (await readdir(jsonDir))
      .filter(f => f.endsWith('.json'))
      .sort((a, b) => parseInt(a) - parseInt(b));

    for (const file of chapterFiles) {
      try {
        const ch = JSON.parse(await readFile(join(jsonDir, file), 'utf-8'));
        if (ch.success === true && ch.body) {
          chapters.push({
            id: ch.id,
            title: ch.title,
            url: ch.url,
            volume: ch.volume,
            volumeTitle: ch.volume_title,
            body: ch.body,
          });
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }
  } else {
    // New format: numbered volume folders (001/, 002/, etc.) with content field
    const entries = await readdir(rawDir, { withFileTypes: true });
    const volumeDirs = entries
      .filter(e => e.isDirectory() && /^\d+$/.test(e.name))
      .map(e => e.name)
      .sort((a, b) => parseInt(a) - parseInt(b));

    if (volumeDirs.length === 0) {
      throw new Error(`No volume directories found (expected 001/, 002/, etc.)`);
    }

    // Get volume titles from meta if available
    const volumeMap = new Map();
    if (novel.volumes) {
      for (const v of novel.volumes) {
        volumeMap.set(v.serial, v.title || `Volume ${v.serial}`);
      }
    }

    for (const volDir of volumeDirs) {
      const volNum = parseInt(volDir);
      const volTitle = volumeMap.get(volNum) || `Volume ${volNum}`;
      const volPath = join(rawDir, volDir);
      const chapterFiles = (await readdir(volPath))
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => parseInt(a) - parseInt(b));

      for (const file of chapterFiles) {
        try {
          const ch = JSON.parse(await readFile(join(volPath, file), 'utf-8'));
          const body = ch.content || ch.body;
          if (body) {
            chapters.push({
              id: ch.serial || parseInt(file),
              title: ch.title,
              url: ch.url || '',
              volume: volNum,
              volumeTitle: volTitle,
              body,
            });
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      }
    }
  }

  if (chapters.length === 0) {
    throw new Error(`Zero valid chapters after filtering`);
  }

  console.log(`   ├─ Chapters: ${chapters.length} (${skipped} skipped)`);

  // Bundle chapters (200 per bundle)
  const BUNDLE_SIZE = 200;
  const bundles = [];

  for (let i = 0; i < chapters.length; i += BUNDLE_SIZE) {
    const chunk = chapters.slice(i, i + BUNDLE_SIZE);
    const bundleId = bundles.length + 1;
    const firstId = chunk[0].id;
    const lastId = chunk[chunk.length - 1].id;
    const range = `${firstId}-${lastId}`;
    const file = `vol-${String(bundleId).padStart(3, '0')}.json.br`;

    const bundleData = {
      bundleId,
      range,
      novelSlug: slug,
      chapters: chunk,
    };

    const json = JSON.stringify(bundleData);
    const compressed = brotliCompressSync(Buffer.from(json), {
      params: { [constants.BROTLI_PARAM_QUALITY]: 6 },
    });

    bundles.push({
      id: bundleId,
      range,
      file,
      chapters: chunk.length,
      sizeKB: Math.round(compressed.length / 1024),
      _compressed: compressed,
    });
  }

  const lastBundleSize = bundles[bundles.length - 1].chapters;
  console.log(`   ├─ Bundles: ${bundles.length} × ${BUNDLE_SIZE} chapters (last: ${lastBundleSize})`);

  // Create output directory
  const outDir = join(novelsDir, slug);
  await mkdir(outDir, { recursive: true });

  // Write bundles
  for (const bundle of bundles) {
    const bundlePath = join(outDir, bundle.file);
    await writeFile(bundlePath, bundle._compressed);
    console.log(`   ├─ ${bundle.file} (${bundle.sizeKB} KB)`);
  }

  // Write info.json
  const infoData = {
    id: slug,
    title: novel.title,
    authors,
    synopsis,
    genres,
    source,
    sourceUrl,
    totalChapters: chapters.length,
    bundleSize: BUNDLE_SIZE,
    bundles: bundles.map(({ _compressed, ...rest }) => rest),
  };
  await writeFile(join(outDir, 'info.json'), JSON.stringify(infoData, null, 2));
  console.log(`   ├─ info.json ✓`);

  // Write metadata.json
  const metadataData = {
    slug,
    title: novel.title,
    description: `Read ${novel.title} online. ${chapters.length} chapters available.`,
    author: authors[0] || 'Unknown',
    coverImage: `/novels/${slug}/cover.jpg`,
    totalChapters: chapters.length,
    publishDate: '2020-01-01',
    language,
    volumes: bundles.map(b => ({
      id: b.id,
      file: b.file,
      chapterRange: b.range.split('-').map(Number),
    })),
  };
  await writeFile(join(outDir, 'metadata.json'), JSON.stringify(metadataData, null, 2));
  console.log(`   ├─ metadata.json ✓`);

  // Copy cover.jpg
  const coverSrc = join(rawDir, 'cover.jpg');
  try {
    await access(coverSrc);
    await copyFile(coverSrc, join(outDir, 'cover.jpg'));
    console.log(`   ├─ cover.jpg ✓`);
  } catch {
    console.log(`   ⚠ cover.jpg not found in raw, skipping`);
  }

  // Remove raw source folder after successful migration
  await rm(rawDir, { recursive: true, force: true });
  console.log(`   └─ Removed raw folder: ${folderName} ✓`);

  return {
    id: slug,
    title: novel.title,
    slug,
    cover: `/novels/${slug}/cover.jpg`,
    totalChapters: chapters.length,
    bundles: bundles.length,
    bundleSize: BUNDLE_SIZE,
    source,
    sourceUrl,
    lastUpdated: new Date().toISOString().split('T')[0],
    authors,
    synopsis,
    genres,
  };
}

async function updateIndex(novelsDir, novelEntries) {
  const indexPath = join(novelsDir, 'index.json');
  let index;

  try {
    index = JSON.parse(await readFile(indexPath, 'utf-8'));
  } catch {
    index = { version: '1.0', generated: '', novels: [] };
  }

  for (const entry of novelEntries) {
    const existingIdx = index.novels.findIndex(n => n.slug === entry.slug);
    if (existingIdx >= 0) {
      index.novels[existingIdx] = entry;
    } else {
      index.novels.push(entry);
    }
  }

  index.generated = new Date().toISOString();
  await writeFile(indexPath, JSON.stringify(index, null, 2));
}

async function main() {
  const filter = process.argv[2];
  const rawBase = 'public/raw';
  const novelsDir = 'public/novels';

  let dirs;
  try {
    dirs = await readdir(rawBase);
  } catch {
    console.error(`❌ Directory "${rawBase}" not found.`);
    process.exit(1);
  }

  // Filter by argument if provided
  if (filter) {
    dirs = dirs.filter(d => d === filter);
    if (dirs.length === 0) {
      console.error(`❌ Novel "${filter}" not found in ${rawBase}/`);
      process.exit(1);
    }
  }

  // Filter out non-directories (like .DS_Store)
  const novelDirs = [];
  for (const d of dirs) {
    try {
      const metaPath = join(rawBase, d, 'meta.json');
      await access(metaPath);
      novelDirs.push(d);
    } catch {
      // Not a valid novel directory, skip
    }
  }

  if (novelDirs.length === 0) {
    console.error(`❌ No valid novel directories found in ${rawBase}/`);
    process.exit(1);
  }

  console.log(`🔍 Found ${novelDirs.length} novel(s) to migrate...`);

  const indexEntries = [];
  let failures = 0;

  for (const dir of novelDirs) {
    try {
      const entry = await migrateNovel(join(rawBase, dir), novelsDir);
      indexEntries.push(entry);
    } catch (err) {
      console.error(`\n❌ Failed to migrate "${dir}": ${err.message}`);
      failures++;
    }
  }

  // Update index.json
  if (indexEntries.length > 0) {
    await updateIndex(novelsDir, indexEntries);
    console.log(`   └─ index.json updated ✓`);
  }

  console.log(`\n✅ Migration complete: ${indexEntries.length} novel(s) processed.`);
  if (failures > 0) {
    console.log(`⚠ ${failures} novel(s) failed.`);
    process.exit(1);
  }
}

// Export for programmatic use (migrate-ui.mjs)
export { migrateNovel, updateIndex, slugify, extractSource, stripHtml };

// Run as CLI only when executed directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && __filename === process.argv[1]) {
  main().catch(err => {
    console.error(`\n💥 Unexpected error:`, err);
    process.exit(1);
  });
}
