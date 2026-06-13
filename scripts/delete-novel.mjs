#!/usr/bin/env node
import { readFile, writeFile, readdir, rm, access } from 'fs/promises';
import { join } from 'path';
import { createInterface } from 'readline';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const NOVELS_DIR = 'public/novels';

/**
 * Load and parse the novels index.json file.
 * @param {string} novelsDir - Path to the novels directory
 * @returns {Promise<{version: string, generated: string, novels: Array}>}
 */
export async function loadIndex(novelsDir) {
  const indexPath = join(novelsDir, 'index.json');
  try {
    await access(indexPath);
  } catch {
    throw new Error(`index.json not found at ${indexPath}`);
  }
  const raw = await readFile(indexPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.novels)) {
    throw new Error(`index.json is missing "novels" array at ${indexPath}`);
  }
  return parsed;
}

/**
 * Find a novel entry by slug in the index.
 * @param {{novels: Array}} index
 * @param {string} slug
 * @returns {object | undefined}
 */
export function findNovel(index, slug) {
  return index.novels.find((n) => n.slug === slug);
}

/**
 * List file names inside a novel directory.
 * @param {string} dir - Absolute or relative path to the novel folder
 * @returns {Promise<string[]>}
 */
export async function getNovelFiles(dir) {
  try {
    const entries = await readdir(dir);
    return entries;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Return a new index object with the given slug removed.
 * Does not mutate the input.
 * @param {{version: string, generated: string, novels: Array}} index
 * @param {string} slug
 * @returns {{version: string, generated: string, novels: Array}}
 */
export function removeFromIndex(index, slug) {
  return {
    ...index,
    generated: new Date().toISOString(),
    novels: index.novels.filter((n) => n.slug !== slug),
  };
}

/**
 * Create a git commit for the deletion.
 * @param {string} title - Novel title
 * @param {string} slug - Novel slug
 * @returns {boolean} true if committed
 */
function createGitCommit(title, slug) {
  try {
    execFileSync('git', ['add', '-A'], { stdio: 'inherit' });
    execFileSync('git', ['commit', '-m', `chore: remove novel ${title}`], {
      stdio: 'inherit',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Prompt the user with a yes/no question.
 * @param {string} question
 * @returns {Promise<boolean>}
 */
function promptConfirm(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

async function main() {
  const slug = process.argv[2];
  const novelsDir = process.argv[3] || NOVELS_DIR;

  if (!slug) {
    console.error('❌ Usage: node scripts/delete-novel.mjs <slug> [novelsDir]');
    console.error('   Example: node scripts/delete-novel.mjs shadow-slave');
    process.exit(1);
  }

  const SLUG_REGEX = /^[a-z0-9-]+$/;
  if (!SLUG_REGEX.test(slug)) {
    console.error(`❌ Invalid slug format: "${slug}"`);
    console.error('   Slugs must contain only lowercase letters, numbers, and hyphens');
    process.exit(1);
  }

  // 1. Load index
  let index;
  try {
    index = await loadIndex(novelsDir);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    console.error('   Try checking the file manually or running: git checkout public/novels/index.json');
    process.exit(1);
  }

  // 2. Validate slug exists
  const novel = findNovel(index, slug);
  if (!novel) {
    console.error(`❌ Novel with slug "${slug}" not found in index.json`);
    const available = index.novels.map((n) => n.slug).join(', ');
    console.error(`   Available slugs: ${available}`);
    process.exit(1);
  }

  // 3. Gather summary info
  const novelDir = join(novelsDir, slug);
  const files = await getNovelFiles(novelDir);

  console.log('\n📖 Novel deletion summary:');
  console.log(`   ├─ Title:     ${novel.title}`);
  console.log(`   ├─ Slug:      ${novel.slug}`);
  console.log(`   ├─ Chapters:  ${novel.totalChapters ?? 'unknown'}`);
  console.log(`   ├─ Volumes:   ${novel.bundles ?? 'unknown'}`);
  console.log(`   ├─ Files:     ${files.length}`);
  for (const f of files.slice(0, 10)) {
    console.log(`   │   • ${f}`);
  }
  if (files.length > 10) {
    console.log(`   │   … and ${files.length - 10} more`);
  }
  console.log(`   └─ Directory: ${novelDir}\n`);

  // 4. Confirm
  const confirmed = await promptConfirm(
    `Delete "${novel.title}" (${novel.totalChapters ?? 'unknown'} chapters)? [y/N] `
  );
  if (!confirmed) {
    console.log('❎ Deletion cancelled.');
    process.exit(0);
  }

  // 5. Delete directory
  try {
    await rm(novelDir, { recursive: true, force: true });
    console.log(`✅ Deleted directory: ${novelDir}`);
  } catch (err) {
    console.error(`❌ Failed to delete directory: ${err.message}`);
    process.exit(1);
  }

  // 6. Update index.json
  try {
    const updated = removeFromIndex(index, slug);
    await writeFile(join(novelsDir, 'index.json'), JSON.stringify(updated, null, 2));
    console.log('✅ Removed entry from index.json');
  } catch (err) {
    console.error(`❌ Failed to update index.json: ${err.message}`);
    console.error('⚠️  Directory was deleted but index still references it');
    console.error('   Manual fix: edit public/novels/index.json to remove the entry');
    process.exit(1);
  }

  // 7. Optional git commit
  const wantsCommit = await promptConfirm('🔧 Create a git commit for this deletion? (y/N) ');
  if (wantsCommit) {
    const ok = createGitCommit(novel.title, slug);
    if (ok) {
      console.log('✅ Git commit created');
    } else {
      console.log('⚠️  Git commit failed (you can commit manually)');
    }
  }

  console.log(`\n🎉 Done. "${novel.title}" has been removed.`);
}

// Run as CLI only when executed directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && __filename === process.argv[1]) {
  main().catch((err) => {
    console.error('\n💥 Unexpected error:', err);
    process.exit(1);
  });
}
