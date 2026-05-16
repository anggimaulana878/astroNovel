# Homepage Reading History - Implementation Plan

> **For agentic workers:** Implement this only after reading the paired spec: `docs/superpowers/specs/2026-05-16-homepage-reading-history-design.md`.

**Goal:** Add a homepage history menu that lists previously read novels, shows the latest chapter and last-read time, and resumes reading using current reader preferences.

**Architecture fit:** Keep the homepage statically rendered and layer history in with client-side localStorage reads only.

**Spec reference:** `docs/superpowers/specs/2026-05-16-homepage-reading-history-design.md`

---

## 1. Implementation Strategy

Build the feature in the smallest possible vertical slice:

1. Add a homepage history entry point.
2. Load and normalize history from localStorage on the client.
3. Render the history menu/panel.
4. Wire resume links using existing `reader-preferences` logic.
5. Verify empty, malformed, and mobile cases.

Do not redesign the homepage or change persistence format unless implementation proves it is necessary.

---

## 2. Source-of-Truth Files

Read these before implementation:

- `src/pages/index.astro`
- `src/pages/novels/[slug]/index.astro`
- `src/pages/novels/[slug]/read.astro`
- `src/components/NovelCard.astro`
- `src/lib/batch-calculator.ts`
- `src/types/novel.ts`

Supporting repo guidance:

- `AGENTS.md`
- `docs/superpowers/specs/2026-05-16-homepage-reading-history-design.md`

---

## 3. Expected File Changes

### 3.1 Create

- `src/components/ReadingHistoryMenu.astro`

### 3.2 Modify

- `src/pages/index.astro`

### 3.3 Optional / Only If Needed

- `src/types/novel.ts` if implementation benefits from a shared history item type
- `src/components/NovelCard.astro` only if homepage cards should also show progress during the same change

---

## 4. Planned Component Responsibilities

### 4.1 `src/pages/index.astro`

Responsibilities:

- keep server-side novel loading unchanged
- preserve current page title and novel grid behavior
- insert the History trigger into the header area
- pass enough serialized novel metadata to the client-side history component

Recommended approach:

- keep the page as the owner of the novel list
- add a new component near the header rather than mixing all client-side logic directly into the page

### 4.2 `src/components/ReadingHistoryMenu.astro`

Responsibilities:

- render the History button
- read localStorage on the client
- parse `novel-progress:*` entries safely
- read `reader-preferences` with fallback `{ batchMode: 'chapters', batchSize: 5 }`
- match local progress against known novels
- sort history entries by `lastUpdated` descending
- render empty state and populated state
- build resume URLs for each item

Recommended internal sections:

- server-rendered shell markup
- embedded serialized novel list as JSON payload in markup or an inline script block
- scoped styles
- inline script for browser-only behavior

---

## 5. Data Flow Plan

### 5.1 Inputs

From server-rendered homepage data:

- `slug`
- `title`
- `coverImage`

From localStorage:

- progress entries under `novel-progress:*`
- global preferences under `reader-preferences`

### 5.2 Processing Steps

1. Collect all localStorage keys.
2. Filter keys beginning with `novel-progress:`.
3. Parse each JSON payload inside `try/catch`.
4. Validate that `slug`, `lastChapter`, and `lastUpdated` are usable.
5. Match each valid progress entry with a novel from the homepage dataset.
6. Discard unknown slugs.
7. Read `reader-preferences`; if missing or malformed, use fallback values.
8. Map `reader-preferences.batchMode` to reader URL query param `mode`.
9. Map `reader-preferences.batchSize` to reader URL query param `size`.
10. For words mode, reuse the stored `batchSize` value directly so behavior matches the detail-page Continue Reading link; do not apply an extra `* 1000` conversion in the homepage menu.
11. Build resume URLs.
12. Sort by `lastUpdated` descending.
13. Render the final menu state.

### 5.3 Output Model

Recommended local output shape:

```ts
interface ReadingHistoryItem {
  slug: string;
  title: string;
  lastChapter: number;
  lastUpdated: number;
  resumeUrl: string;
}
```

Recommended serialization shape passed from `index.astro` into the history component:

```ts
interface ReadingHistoryNovelSeed {
  slug: string;
  title: string;
  coverImage: string;
}
```

---

## 6. UI Plan

### 6.1 Header Integration

Update homepage header layout from title-only to title + action.

Recommended CSS direction:

- desktop: `display: flex`, `justify-content: space-between`, `align-items: center`
- mobile: allow wrapping or stacked layout if needed, but preserve readability

### 6.2 Trigger Styling

Reuse existing repo button language:

- border using `var(--border)`
- background using `var(--bg-primary)` / `var(--bg-secondary)`
- text using `var(--text-primary)`
- hover transition matching existing buttons
- inherit existing CSS-variable-based dark-mode behavior automatically

### 6.3 Menu Layout

Each history row should include:

- title
- latest chapter label
- human-readable last-read text
- clickable resume behavior

Keep the first version compact. Avoid adding filters, tabs, or management actions.

For v1, use a dropdown panel anchored to the History trigger rather than a modal or page-level drawer.

---

## 7. Edge-Case Handling Plan

### 7.1 No History

- render an explicit empty state
- avoid showing a blank container

### 7.2 Malformed Progress Entries

- ignore bad entries silently
- do not crash the menu or the homepage

### 7.3 Unknown Novel Slugs

- ignore entries for novels no longer present in the homepage list

### 7.4 Malformed Preferences

- fallback to:

```json
{
  "batchMode": "chapters",
  "batchSize": 5
}
```

### 7.5 Time Formatting

- use browser-local formatting
- keep the first implementation simple and deterministic
- use a localized absolute timestamp for v1 instead of relative time
- prefer a format that is readable in Indonesian/English contexts without new dependencies

---

## 8. Step-by-Step Work Breakdown

### Chunk 1: Create the history component shell

**Files:**
- Create: `src/components/ReadingHistoryMenu.astro`

- [ ] Add shell markup for the trigger and panel container
- [ ] Add scoped styles using current CSS variables
- [ ] Add a browser-only script section
- [ ] Verify the component can render on the homepage without using localStorage yet

Expected result:

- a visible History trigger exists
- homepage layout still renders correctly

---

### Chunk 2: Wire homepage integration

**Files:**
- Modify: `src/pages/index.astro`

- [ ] Import the new history component
- [ ] Update `.page-header` layout to fit title + history trigger
- [ ] Pass serialized novel metadata required for client-side matching
- [ ] Verify the novel grid and title remain visually stable

Expected result:

- homepage header contains the History trigger
- no regression in the novel grid layout

---

### Chunk 3: Implement localStorage parsing and normalization

**Files:**
- Modify: `src/components/ReadingHistoryMenu.astro`

- [ ] Enumerate `localStorage` keys matching `novel-progress:`
- [ ] Parse entries defensively
- [ ] Match entries to known homepage novels
- [ ] Read `reader-preferences` with fallback values
- [ ] Map `batchMode`/`batchSize` to `mode`/`size` query params
- [ ] Reuse stored words-mode `batchSize` directly when building resume URLs
- [ ] Build sorted history entries and resume URLs

Expected result:

- valid history entries are available as a rendered client-side list
- malformed entries are skipped safely

---

### Chunk 4: Render states and interactions

**Files:**
- Modify: `src/components/ReadingHistoryMenu.astro`

- [ ] Render populated list state
- [ ] Render empty state
- [ ] Implement open/close interaction
- [ ] Ensure keyboard accessibility is acceptable for first release
- [ ] Ensure each item links to the correct resume URL

Expected result:

- the menu is usable on both mouse and keyboard paths
- each entry resumes from the saved chapter

---

### Chunk 5: Optional follow-up polish

**Files:**
- Optional: `src/components/NovelCard.astro`

- [ ] Decide whether homepage cards should also show `Last read: Ch. X`
- [ ] Only implement if it stays small and does not complicate the main history menu change

Expected result:

- optional progress visibility on cards, without changing the core feature scope

---

## 9. Risks During Implementation

- Over-embedding logic directly in `index.astro` can make the page harder to maintain; prefer a dedicated component.
- Time formatting can become overcomplicated; keep v1 simple.
- Mobile header layout can regress if the button width is not constrained.
- Resume-link logic must stay aligned with the detail page’s Continue Reading behavior.
- Client-side script errors must not break the homepage grid.

---

## 10. Verification Plan

### 10.1 Manual QA

Before finalizing implementation:

1. Open a novel and read far enough to create/update progress.
2. Return to homepage and verify the history item appears.
3. Confirm the item shows the correct chapter number.
4. Confirm entries are sorted by newest `lastUpdated` first.
5. Click a history item and verify it opens the correct novel reader URL.
6. Verify resume URL uses current preference mode and size.
7. Test empty history state by clearing localStorage.
8. Test malformed data by inserting an invalid `novel-progress:*` entry and verify graceful handling.
9. Test mobile layout at existing responsive breakpoints.

### 10.2 Repo Verification Commands

Run in this order after implementation:

```bash
npm run test
npm run astro -- check
npm run build
```

---

## 11. Suggested Commit Boundaries

If implemented later, prefer these logical boundaries:

1. `feat: add homepage reading history menu shell`
2. `feat: load and render reading history from localStorage`
3. `style: polish responsive history menu behavior` *(only if needed)*

If the implementation stays small enough, a single feature commit is also acceptable.

---

## 12. Definition of Done

Implementation is done when:

- the homepage has a working History trigger,
- valid saved progress entries appear in a sorted list,
- each item resumes reading correctly,
- empty and malformed localStorage states are handled safely,
- the homepage remains usable on mobile,
- `npm run test`, `npm run astro -- check`, and `npm run build` all succeed.
