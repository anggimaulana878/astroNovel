# Novel Deletion Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable deletion of novels via browser UI that generates a CLI command for persistent deletion.

**Architecture:** Hybrid approach - browser UI shows confirmation modal and generates CLI command, CLI script performs actual file deletion and index updates. API route validates novel exists and returns deletion package.

**Tech Stack:** Astro 6, TypeScript, Vitest, Node.js fs/promises, HTML `<dialog>` element

---

## File Structure

```
scripts/
└── delete-novel.mjs                    # CLI deletion script (create)

src/
├── lib/
│   └── __tests__/
│       └── novel-deletion.test.ts      # Unit tests for deletion logic (create)
└── pages/
    ├── api/
    │   └── novels/
    │       └── [slug]/
    │           └── delete.ts           # API route (create)
    └── novels/
        └── [slug]/
            └── index.astro             # Novel detail page (edit)

public/
└── novels/
    └── index.json                      # Novel index (runtime modification)
```

---

## Task 1: CLI Deletion Script

**Files:**
- Create: `scripts/delete-novel.mjs`
- Create: `src/lib/__tests__/novel-deletion.test.ts`
- Modify: `package.json` (add script)

### Step 1.1: Write failing test for CLI logic

```typescript
// src/lib/__tests__/novel-deletion.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { readFile, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const TEST_FIXTURES = join(process.cwd(), 'test-fixtures');
const NOVELS_DIR = join(TEST_FIXTURES, 'novels');

describe('novel deletion logic', () => {
  beforeEach(async () => {
    await mkdir(NOVELS_DIR, { recursive: true });
    await mkdir(join(NOVELS_DIR, 'test-novel'), { recursive: true });
    await writeFile(
      join(NOVELS_DIR, 'test-novel', 'metadata.json'),
      JSON.stringify({ title: 'Test Novel', slug: 'test-novel', totalChapters: 10 })
    );
    await writeFile(
      join(NOVELS_DIR, 'index.json'),
      JSON.stringify({
        novels: [
          { id: 'test-novel', title: 'Test Novel', slug: 'test-novel', totalChapters: 10 },
          { id: 'other-novel', title: 'Other Novel', slug: 'other-novel', totalChapters: 20 },
        ],
      })
    );
  });

  afterEach(async () => {
    if (existsSync(TEST_FIXTURES)) {
      await rm(TEST_FIXTURES, { recursive: true, force: true });
    }
  });

  it('deletes novel directory and removes from index', async () => {
    const novelDir = join(NOVELS_DIR, 'test-novel');
    const indexPath = join(NOVELS_DIR, 'index.json');

    expect(existsSync(novelDir)).toBe(true);

    await rm(novelDir, { recursive: true, force: true });

    const indexData = JSON.parse(await readFile(indexPath, 'utf-8'));
    const filtered = indexData.novels.filter((n: any) => n.slug !== 'test-novel');
    await writeFile(indexPath, JSON.stringify({ novels: filtered }));

    expect(existsSync(novelDir)).toBe(false);
    const updatedIndex = JSON.parse(await readFile(indexPath, 'utf-8'));
    expect(updatedIndex.novels).toHaveLength(1);
    expect(updatedIndex.novels[0].slug).toBe('other-novel');
  });

  it('validates slug exists in index before deletion', async () => {
    const indexPath = join(NOVELS_DIR, 'index.json');
    const indexData = JSON.parse(await readFile(indexPath, 'utf-8'));
    const exists = indexData.novels.some((n: any) => n.slug === 'nonexistent');
    expect(exists).toBe(false);
  });

  it('returns error when index.json is missing', async () => {
    await rm(join(NOVELS_DIR, 'index.json'));
    expect(existsSync(join(NOVELS_DIR, 'index.json'))).toBe(false);
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
npm test src/lib/__tests__/novel-deletion.test.ts
```

Expected: PASS (these are integration tests that verify fs operations work)

- [ ] **Step 1.3: Create CLI script**

```javascript
#!/usr/bin/env node
// scripts/delete-novel.mjs
import { readFile, writeFile, readdir, rm, access } from 'fs/promises';
import { join } from 'path';
import { createInterface } from 'readline';

const NOVELS_DIR = join(process.cwd(), 'public', 'novels');
const INDEX_PATH = join(NOVELS_DIR, 'index.json');

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function loadIndex() {
  try {
    const data = await readFile(INDEX_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('❌ Error: public/novels/index.json not found');
      console.error('   Run migration first to create the index.');
      process.exit(1);
    }
    throw err;
  }
}

async function findNovel(slug) {
  const index = await loadIndex();
  const novel = index.novels.find((n) => n.slug === slug);
  if (!novel) {
    console.error(`❌ Error: Novel with slug "${slug}" not found in index.json`);
    console.error('   Available novels:', index.novels.map((n) => n.slug).join(', '));
    process.exit(1);
  }
  return novel;
}

async function getNovelFiles(novelDir) {
  try {
    const files = await readdir(novelDir);
    return files.map((f) => join(novelDir, f));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`❌ Error: Novel directory not found: ${novelDir}`);
      process.exit(1);
    }
    throw err;
  }
}

async function removeFromIndex(slug) {
  const index = await loadIndex();
  const filtered = index.novels.filter((n) => n.slug !== slug);
  await writeFile(INDEX_PATH, JSON.stringify({ ...index, novels: filtered }, null, 2));
  return filtered.length;
}

async function createGitCommit(title) {
  const { execSync } = await import('child_process');
  try {
    execSync('git add public/novels/', { stdio: 'pipe' });
    execSync(`git commit -m "chore: remove novel ${title}"`, { stdio: 'pipe' });
    console.log('✅ Git commit created');
    return true;
  } catch (err) {
    console.warn('⚠️  Warning: Git commit failed. Files deleted but not committed.');
    console.warn('   Run manually: git add public/novels/ && git commit');
    return false;
  }
}

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error('Usage: npm run delete-novel <slug>');
    console.error('Example: npm run delete-novel super-gene');
    process.exit(1);
  }

  const novel = await findNovel(slug);
  const novelDir = join(NOVELS_DIR, slug);
  const files = await getNovelFiles(novelDir);

  console.log('\n📖 Novel deletion summary:');
  console.log(`   Title: ${novel.title}`);
  console.log(`   Chapters: ${novel.totalChapters}`);
  console.log(`   Files to remove: ${files.length}`);
  console.log(`   Directory: ${novelDir}\n`);

  const confirm = await prompt(`Delete "${novel.title}" (${novel.totalChapters} chapters)? [y/N]: `);

  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    process.exit(0);
  }

  console.log('\n🗑️  Deleting files...');
  await rm(novelDir, { recursive: true, force: true });
  console.log(`   ✓ Removed ${files.length} files`);

  console.log('📋 Updating index.json...');
  const remaining = await removeFromIndex(slug);
  console.log(`   ✓ Removed from index (${remaining} novels remaining)`);

  const commit = await prompt('\nCreate git commit? [Y/n]: ');

  if (commit.toLowerCase() !== 'n') {
    await createGitCommit(novel.title);
  }

  console.log('\n✅ Novel deleted successfully!');
  console.log('   Push changes: git push\n');
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
```

- [ ] **Step 1.4: Add script to package.json**

```json
"scripts": {
  "delete-novel": "node scripts/delete-novel.mjs"
}
```

- [ ] **Step 1.5: Test CLI script manually**

```bash
# Test with invalid slug
npm run delete-novel nonexistent

# Test help message
node scripts/delete-novel.mjs
```

Expected: Error messages with available novels listed

- [ ] **Step 1.6: Commit**

```bash
git add scripts/delete-novel.mjs src/lib/__tests__/novel-deletion.test.ts package.json
git commit -m "feat: add CLI script for novel deletion"
```

---

## Task 2: API Route

**Files:**
- Create: `src/pages/api/novels/[slug]/delete.ts`
- Modify: `src/lib/__tests__/novel-deletion.test.ts` (add API tests)

### Step 2.1: Write failing test for API route

```typescript
// Add to src/lib/__tests__/novel-deletion.test.ts
describe('DELETE /api/novels/[slug] route', () => {
  it('validates slug format (alphanumeric + hyphens, max 100 chars)', () => {
    const isValidSlug = (slug: string) => /^[a-z0-9-]{1,100}$/.test(slug);

    expect(isValidSlug('super-gene')).toBe(true);
    expect(isValidSlug('shadow-slave-123')).toBe(true);
    expect(isValidSlug('Invalid_Slug')).toBe(false);
    expect(isValidSlug('slug with spaces')).toBe(false);
    expect(isValidSlug('a'.repeat(101))).toBe(false);
  });

  it('returns 405 for non-DELETE methods', async () => {
    const methods = ['GET', 'POST', 'PUT'];
    for (const method of methods) {
      expect(method).not.toBe('DELETE');
    }
  });
});
```

- [ ] **Step 2.2: Run test to verify it passes**

```bash
npm test src/lib/__tests__/novel-deletion.test.ts
```

- [ ] **Step 2.3: Create API route**

```typescript
// src/pages/api/novels/[slug]/delete.ts
import type { APIRoute } from 'astro';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

export const prerender = false;

const NOVELS_DIR = join(process.cwd(), 'public', 'novels');
const INDEX_PATH = join(NOVELS_DIR, 'index.json');

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{1,100}$/.test(slug);
}

export const DELETE: APIRoute = async ({ params }) => {
  const { slug } = params;

  if (!slug || !isValidSlug(slug)) {
    return new Response(
      JSON.stringify({ error: 'Invalid slug format' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const indexData = JSON.parse(await readFile(INDEX_PATH, 'utf-8'));
    const novel = indexData.novels.find((n: any) => n.slug === slug);

    if (!novel) {
      return new Response(
        JSON.stringify({ error: `Novel not found: ${slug}` }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const novelDir = join(NOVELS_DIR, slug);
    const files = await readdir(novelDir);

    return new Response(
      JSON.stringify({
        novel: {
          slug: novel.slug,
          title: novel.title,
          totalChapters: novel.totalChapters,
          volumes: novel.bundles || 0,
        },
        files: files.map((f) => `public/novels/${slug}/${f}`),
        command: `npm run delete-novel ${slug}`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return new Response(
        JSON.stringify({ error: 'Novel directory not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to read novel metadata' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const PUT: APIRoute = async () => {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
```

- [ ] **Step 2.4: Test API route manually**

```bash
npm run dev
# In another terminal:
curl -X DELETE http://localhost:4321/api/novels/super-gene/delete
curl -X GET http://localhost:4321/api/novels/super-gene/delete
curl -X DELETE http://localhost:4321/api/novels/invalid_slug_123/delete
```

Expected: JSON responses with novel info, 405 errors, 400 validation error

- [ ] **Step 2.5: Commit**

```bash
git add src/pages/api/novels/[slug]/delete.ts src/lib/__tests__/novel-deletion.test.ts
git commit -m "feat: add API route for novel deletion package"
```

---

## Task 3: Novel Detail Page UI

**Files:**
- Modify: `src/pages/novels/[slug]/index.astro`

### Step 3.1: Add delete button to hero actions

Add after the Continue Reading button:

```html
<button class="btn btn-danger" id="delete-btn">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
  Delete Novel
</button>
```

### Step 3.2: Add confirmation modal HTML

Add before closing `</main>` tag:

```html
<dialog id="delete-modal" class="modal">
  <div class="modal-content">
    <div id="modal-confirm">
      <h2>Delete Novel</h2>
      <p class="modal-info">
        <strong id="modal-title"></strong><br>
        <span id="modal-chapters"></span> chapters
      </p>
      <p class="modal-warning">
        This action cannot be undone. The novel will be permanently removed after running the CLI command.
      </p>
      <label for="confirm-input" class="modal-label">
        Type the novel title to confirm:
      </label>
      <input
        type="text"
        id="confirm-input"
        class="modal-input"
        placeholder="Novel title"
        autocomplete="off"
      >
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-danger" id="modal-delete" disabled>Delete</button>
      </div>
    </div>

    <div id="modal-loading" style="display: none;">
      <div class="spinner"></div>
      <p>Preparing deletion command...</p>
    </div>

    <div id="modal-result" style="display: none;">
      <h2>Run This Command</h2>
      <p class="modal-info">
        Copy and run this command in your terminal to permanently delete the novel:
      </p>
      <div class="command-block">
        <code id="command-text"></code>
        <button class="copy-btn" id="copy-btn">Copy</button>
      </div>
      <p class="modal-files">
        <strong>Files to remove:</strong>
        <span id="file-count"></span>
      </p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-close">Close</button>
      </div>
    </div>

    <div id="modal-error" style="display: none;">
      <h2>Error</h2>
      <p id="error-message" class="modal-error-text"></p>
      <p class="modal-fallback">
        You can run this command directly:
      </p>
      <div class="command-block">
        <code id="fallback-command"></code>
        <button class="copy-btn" id="fallback-copy-btn">Copy</button>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-error-close">Close</button>
      </div>
    </div>
  </div>
</dialog>
```

### Step 3.3: Add modal styles

Add to `<style>` block:

```css
.btn-danger {
  background: #dc2626;
  color: white;
  border: none;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
  transform: translateY(-2px);
}

.btn-danger:disabled {
  background: #991b1b;
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger svg {
  display: inline-block;
  vertical-align: middle;
  margin-right: 6px;
}

.modal {
  border: none;
  border-radius: 12px;
  padding: 0;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal::backdrop {
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  padding: 24px;
}

.modal h2 {
  margin: 0 0 16px 0;
  font-size: 1.5em;
}

.modal-info {
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.modal-warning {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 0.9em;
}

.modal-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 0.9em;
}

.modal-input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 1em;
  margin-bottom: 16px;
}

.modal-input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
}

.command-block {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.command-block code {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  word-break: break-all;
}

.copy-btn {
  background: var(--accent);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  white-space: nowrap;
}

.copy-btn:hover {
  background: var(--accent-hover);
}

.copy-btn.copied {
  background: #16a34a;
}

.modal-files {
  font-size: 0.9em;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.modal-error-text {
  color: #dc2626;
  margin-bottom: 16px;
}

.modal-fallback {
  font-size: 0.9em;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 24px auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### Step 3.4: Add JavaScript for modal logic

Add to `<script>` block:

```typescript
const deleteBtn = document.getElementById('delete-btn') as HTMLButtonElement;
const modal = document.getElementById('delete-modal') as HTMLDialogElement;
const modalTitle = document.getElementById('modal-title') as HTMLElement;
const modalChapters = document.getElementById('modal-chapters') as HTMLElement;
const confirmInput = document.getElementById('confirm-input') as HTMLInputElement;
const modalDeleteBtn = document.getElementById('modal-delete') as HTMLButtonElement;
const modalCancelBtn = document.getElementById('modal-cancel') as HTMLButtonElement;
const modalCloseBtn = document.getElementById('modal-close') as HTMLButtonElement;
const modalErrorCloseBtn = document.getElementById('modal-error-close') as HTMLButtonElement;
const modalConfirm = document.getElementById('modal-confirm') as HTMLElement;
const modalLoading = document.getElementById('modal-loading') as HTMLElement;
const modalResult = document.getElementById('modal-result') as HTMLElement;
const modalError = document.getElementById('modal-error') as HTMLElement;
const commandText = document.getElementById('command-text') as HTMLElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const fallbackCommand = document.getElementById('fallback-command') as HTMLElement;
const fallbackCopyBtn = document.getElementById('fallback-copy-btn') as HTMLButtonElement;
const errorMessage = document.getElementById('error-message') as HTMLElement;
const fileCount = document.getElementById('file-count') as HTMLElement;

const slug = window.location.pathname.split('/')[2];
const novelTitle = document.querySelector('.info h1')?.textContent || '';
const novelChapters = document.querySelector('.meta span:last-child')?.textContent || '';

deleteBtn?.addEventListener('click', () => {
  modalTitle.textContent = novelTitle;
  modalChapters.textContent = novelChapters.replace(' chapters', '');
  confirmInput.value = '';
  modalDeleteBtn.disabled = true;
  modalConfirm.style.display = 'block';
  modalLoading.style.display = 'none';
  modalResult.style.display = 'none';
  modalError.style.display = 'none';
  modal.showModal();
});

confirmInput?.addEventListener('input', () => {
  modalDeleteBtn.disabled = confirmInput.value !== novelTitle;
});

modalCancelBtn?.addEventListener('click', () => modal.close());
modalCloseBtn?.addEventListener('click', () => modal.close());
modalErrorCloseBtn?.addEventListener('click', () => modal.close());

modalDeleteBtn?.addEventListener('click', async () => {
  modalConfirm.style.display = 'none';
  modalLoading.style.display = 'block';

  try {
    const res = await fetch(`/api/novels/${slug}/delete`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to get deletion info');
    }

    modalLoading.style.display = 'none';
    modalResult.style.display = 'block';
    commandText.textContent = data.command;
    fileCount.textContent = `${data.files.length} files`;
  } catch (err: any) {
    modalLoading.style.display = 'none';
    modalError.style.display = 'block';
    errorMessage.textContent = err.message;
    fallbackCommand.textContent = `npm run delete-novel ${slug}`;
  }
});

async function copyCommand(text: string, btn: HTMLButtonElement) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 2000);
  } catch (err) {
    btn.textContent = 'Failed';
    setTimeout(() => {
      btn.textContent = 'Copy';
    }, 2000);
  }
}

copyBtn?.addEventListener('click', () => copyCommand(commandText.textContent || '', copyBtn));
fallbackCopyBtn?.addEventListener('click', () => copyCommand(fallbackCommand.textContent || '', fallbackCopyBtn));
```

### Step 3.5: Test UI manually

```bash
npm run dev
# Visit http://localhost:4321/novels/super-gene/
# Click "Delete Novel" button
# Test modal open/close
# Type wrong title (button stays disabled)
# Type correct title (button enables)
# Click Delete (API call happens)
# Copy command
```

- [ ] **Step 3.6: Commit**

```bash
git add src/pages/novels/[slug]/index.astro
git commit -m "feat: add delete button and confirmation modal to novel detail page"
```

---

## Task 4: Integration Testing

### Step 4.1: Test full flow end-to-end

```bash
# Start dev server
npm run dev

# In browser:
# 1. Visit http://localhost:4321/novels/test-novel/ (use a test novel)
# 2. Click "Delete Novel"
# 3. Type title to confirm
# 4. Click Delete
# 5. Copy command

# In terminal:
npm run delete-novel test-novel

# Verify:
# - Files deleted from public/novels/test-novel/
# - Entry removed from public/novels/index.json
# - Git commit created (if opted in)
```

### Step 4.2: Test error cases

```bash
# Test with nonexistent novel
npm run delete-novel nonexistent-novel

# Test API with invalid slug
curl -X DELETE http://localhost:4321/api/novels/Invalid_Slug/delete
```

Expected: Clear error messages

- [ ] **Step 4.3: Final commit**

```bash
git add .
git commit -m "test: complete integration testing for novel deletion feature"
```

---

## Summary

**Total tasks:** 4
**Estimated time:** 45-60 minutes
**Key files:** 4 (1 script, 1 API route, 1 test file, 1 page edit)

**Next steps:**
1. Push to git
2. Vercel auto-deploys
3. Test in production environment
4. Use feature to delete unwanted novels
