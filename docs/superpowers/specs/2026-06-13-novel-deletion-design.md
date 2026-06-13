# Novel Deletion Feature Design

**Date:** 2026-06-13
**Status:** Approved
**Approach:** Hybrid (Browser UI + CLI persistence)

## Problem

Users can add novels via the migration tool but cannot remove them. There is no deletion workflow.

## Constraint

Vercel serverless functions have a **read-only filesystem** and cannot commit to git. Persistent deletions must happen via a local CLI script. The browser UI serves as a discovery and confirmation gate, not the deletion mechanism itself.

## User Flow

```
1. User visits /novels/{slug}/
2. Sees red "Delete Novel" button in hero actions
3. Clicks → confirmation modal opens
4. Modal shows: novel title, chapter count, "type title to confirm" input
5. User types exact title → "Delete" button enables
6. User clicks Delete → calls DELETE /api/novels/{slug}
7. API returns: novel metadata, affected files list, CLI command
8. Modal replaces content with: copyable CLI command + file list
9. User copies command, runs locally:
   - Files deleted from public/novels/{slug}/
   - Entry removed from public/novels/index.json
   - localStorage progress cleared
   - Optional git commit created
10. User pushes → next Vercel deploy reflects deletion
```

## Components

### 1. Novel Detail Page UI

**File:** `src/pages/novels/[slug]/index.astro`

Add to hero section `.actions` area:
- Red delete button with trash icon
- Confirmation modal (inline `<dialog>` element)

Modal states:
1. **Confirm** — novel info display, type-to-confirm input, delete button (disabled until title matches)
2. **Loading** — spinner while API call in progress
3. **Result** — copyable CLI command block, list of files that will be removed, "copied" feedback

### 2. API Route

**File:** `src/pages/api/novels/[slug]/delete.ts`

- Method: `DELETE`
- `prerender = false` (serverless)
- Validates slug exists in `public/novels/index.json`
- Reads `public/novels/{slug}/metadata.json` for novel info
- Scans `public/novels/{slug}/` for all files (metadata, volumes, cover)
- Returns JSON response:

```typescript
interface DeletePackage {
  novel: {
    slug: string;
    title: string;
    totalChapters: number;
    volumes: number;
  };
  files: string[];
  command: string; // "npx node scripts/delete-novel.mjs {slug}"
}
```

Error responses:
- `404` — Novel not found (slug not in index.json)
- `405` — Method not allowed (not DELETE)
- `500` — Failed to read novel metadata

### 3. CLI Script

**File:** `scripts/delete-novel.mjs`

Invoked via: `npm run delete-novel <slug>`

Steps:
1. Validate slug exists in `public/novels/index.json`
2. Read and display summary: title, chapters, volumes, file count
3. Prompt for confirmation: `Delete "{title}" ({chapters} chapters)? [y/N]`
4. On confirm:
   - `rm -rf public/novels/{slug}/`
   - Remove entry from `public/novels/index.json` (read → filter → write)
   - Clear cache key from `novel-loader.ts` (handled by redeploy, no action needed)
5. Optional: create git commit `chore: remove novel {title}` (prompt user)
6. Print summary: files removed, index updated, commit created (if opted in)

package.json addition:
```json
"delete-novel": "node scripts/delete-novel.mjs"
```

## Error Handling

| Error | Where | Response |
|-------|-------|----------|
| Novel not found | API | 404 + error message |
| Novel not found | CLI | Exit 1 with message |
| index.json corrupt/unreadable | CLI | Exit 1, suggest manual fix |
| API unreachable from browser | Modal | Show error + display command directly for manual copy |
| Metadata read fails | API | 500 + error message |
| Git commit fails | CLI | Files still deleted, warn user to commit manually |
| Title mismatch in modal | Browser | Delete button stays disabled |

## Security

- API route validates slug format: alphanumeric + hyphens only, max 100 chars
- No filesystem writes from API route (read-only)
- CLI script uses `path.join` with `process.cwd()` to prevent path traversal
- Modal requires exact title match before enabling delete button (prevents accidental deletion)
- No authentication required (this is a personal tool)

## Files Changed

| File | Action |
|------|--------|
| `src/pages/novels/[slug]/index.astro` | Edit — add delete button + modal |
| `src/pages/api/novels/[slug]/delete.ts` | Create — API route |
| `scripts/delete-novel.mjs` | Create — CLI deletion script |
| `package.json` | Edit — add `delete-novel` script |

## Testing

- **CLI:** Test with valid slug, invalid slug, already-deleted slug
- **API:** Test 404 for missing novel, 200 for valid novel, 405 for wrong method
- **Browser:** Test modal open/close, type-to-confirm enable/disable, API call, command copy feedback
- **Integration:** Full flow — browser → copy command → run CLI → verify files removed → git commit → push

## Out of Scope

- Bulk deletion (multiple novels at once)
- Novel editing (title, description, etc.)
- Soft delete / trash / restore
- Authentication for management operations
