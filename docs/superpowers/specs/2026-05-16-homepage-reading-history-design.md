# Homepage Reading History - Design Document

**Date**: 2026-05-16  
**Status**: Draft  
**Version**: 1.0

---

## 1. Overview

Add a homepage reading history menu so the user can quickly see which novels have been read, the latest chapter reached, and when each novel was last read.

This feature is intended to reduce friction when resuming reading from the homepage without first opening each novel detail page.

**Primary user goal**: “From the homepage, I want to see my recent reading history and continue a novel from the last chapter I reached.”

---

## 2. Existing Behavior and Constraints

### 2.1 Current Progress Storage

The app already stores per-novel reading progress in browser `localStorage`.

Known keys:

- `novel-progress:{slug}`
- `reader-preferences`
- `darkMode`

Current `novel-progress:{slug}` shape:

```json
{
  "slug": "string",
  "lastChapter": 123,
  "lastUpdated": 1710000000000
}
```

### 2.2 Current UI Behavior

- The homepage (`src/pages/index.astro`) is prerendered static and currently renders only the page title plus the novel grid.
- The novel detail page (`src/pages/novels/[slug]/index.astro`) already reads `novel-progress:{slug}` and `reader-preferences` to power the **Continue Reading** button.
- `src/components/NovelCard.astro` already supports an optional `lastChapter` prop, but the homepage does not currently supply it.

### 2.3 Important Architectural Constraints

- The homepage is static, so reading history must be loaded **client-side only**.
- Progress is stored as separate localStorage entries per novel, not in a centralized history index.
- The currently available timeline signal is only `lastUpdated`, which represents **last read time**, not full session history.
- No backend, account, or cross-device sync exists. History is browser-local.

---

## 3. Problem Statement

The app persists useful reading progress, but that information is only reused on the novel detail page. From the homepage, the user cannot currently:

- see which novels were recently read,
- see the latest saved chapter,
- see when a novel was last opened,
- jump directly back into a novel from a consolidated history UI.

This creates unnecessary navigation steps and hides already-available progress data.

---

## 4. Goals

### 4.1 Functional Goals

- Add a **History** entry point on the homepage.
- Show a list of novels that have saved reading progress.
- For each history item, show:
  - novel title,
  - latest saved chapter,
  - last read time derived from `lastUpdated`.
- Allow the user to continue reading directly from each history item.
- Reuse the current `reader-preferences` behavior for `mode` and `size` when building resume URLs.

### 4.2 Non-Goals

- No full reading-session timeline.
- No server-side persistence.
- No authentication or multi-device sync.
- No redesign of the homepage grid.
- No new global state library.

---

## 5. Proposed UX

### 5.1 Entry Point

Add a **History** button in the homepage header.

Recommended placement:

- right side of `.page-header`
- preserve the current title on the left
- convert the header to a flex row for minimal layout disruption

### 5.2 Menu / Panel Behavior

Clicking the History button opens a lightweight client-side dropdown panel anchored to the header button.

Each entry includes:

- novel title
- `Chapter {lastChapter}`
- a localized absolute timestamp for v1, for example:
  - `Last read 16 May 2026, 20:30`

V1 should prefer a localized absolute timestamp over relative time so the feature stays deterministic and easy to verify.

Each entry links to:

```text
/novels/{slug}/read?start={lastChapter}&mode={batchMode}&size={batchSize}
```

where `batchMode` and `batchSize` come from `reader-preferences`, using the same fallback already used by the detail page.

Explicit mapping:

- localStorage `reader-preferences.batchMode` -> reader URL query param `mode`
- localStorage `reader-preferences.batchSize` -> reader URL query param `size`

Important words-mode nuance:

- the current detail-page Continue Reading link reuses the stored `batchSize` value directly
- the reader settings form in `read.astro` multiplies words-mode UI input by `1000` only when a user changes settings from the reader page
- this homepage history feature should mirror the existing Continue Reading behavior and reuse stored `batchSize` directly when building resume URLs

### 5.3 Empty State

If there is no saved history, the menu should show a short empty state, for example:

> No reading history yet. Open a novel and start reading to see it here.

### 5.4 Ordering

Sort entries by `lastUpdated` descending so the most recently read novels appear first.

---

## 6. Data Model

### 6.1 Reused Existing Data

No storage migration is required for the initial feature.

Reused fields:

- `slug`
- `lastChapter`
- `lastUpdated`

### 6.2 Derived UI Model

The homepage history UI should derive a client-side view model by combining:

1. localStorage progress entries (`novel-progress:*`)
2. the already-rendered novel metadata available on the homepage

Suggested UI model:

```ts
interface ReadingHistoryItem {
  slug: string;
  title: string;
  coverImage: string;
  lastChapter: number;
  lastUpdated: number;
  resumeUrl: string;
}
```

This can remain local to the homepage component or a new history component. It does not require a shared domain type unless implementation reveals reuse value.

The homepage only needs a small serialized subset of novel metadata for the history UI:

- `slug`
- `title`
- `coverImage`

---

## 7. Technical Approach

### 7.1 Rendering Strategy

Because the homepage is static, the history UI must:

- render server-safe shell markup first,
- hydrate behavior with an inline client-side script,
- read localStorage only in the browser.

### 7.2 Data Loading Flow

1. Homepage renders with the server-known novel list.
2. Client-side script runs after load.
3. Script scans localStorage keys matching `novel-progress:`.
4. Script parses valid entries and ignores malformed ones.
5. Script matches each progress entry to a homepage novel.
6. Script reads `reader-preferences` with current fallback behavior.
7. Script maps `reader-preferences.batchMode` -> URL `mode` and `reader-preferences.batchSize` -> URL `size`.
8. Script builds history entries and sorts them by `lastUpdated` descending.
9. Script renders the menu state.

The serialized homepage novel metadata should be embedded into the history component as JSON in markup or script payload so the browser-side code can match `novel-progress:{slug}` entries against known novels without refetching data.

### 7.3 Resume URL Logic

Resume URLs must stay aligned with the current Continue Reading behavior on the novel detail page.

Fallback preferences:

```json
{
  "batchMode": "chapters",
  "batchSize": 5
}
```

---

## 8. Edge Cases and Failure Handling

### 8.1 Malformed localStorage Data

If JSON parsing fails or required fields are missing:

- skip that entry,
- do not break the menu,
- do not block rendering of other valid history entries.

### 8.2 Deleted or Missing Novels

If a progress entry exists for a slug that is no longer present in the homepage novel list:

- exclude it from the visible history menu,
- optionally leave cleanup for a later improvement,
- do not show a broken link.

### 8.3 Empty History

If no valid progress entries are found:

- show the empty state,
- do not render a blank panel.

### 8.4 Browser-Only Persistence

Documented limitation:

- history is tied to the current browser storage,
- clearing browser data removes history,
- the feature does not sync across devices.

---

## 9. Accessibility and Responsive Behavior

### 9.1 Accessibility

- The History trigger must be keyboard reachable.
- The panel/menu must be operable without a pointer.
- Touch targets should remain at least consistent with existing 44px button patterns in the repo.
- Hidden/visible state should be exposed through semantic button and panel behavior as part of implementation.
- The new menu should inherit the existing CSS-variable-based light/dark theming automatically; no extra `darkMode` behavior is needed beyond reusing current tokens.

### 9.2 Responsive Expectations

- The homepage header must continue to work at existing breakpoints used by the page (`768px`, `480px`).
- The history trigger must not push the page title into an unusable layout.
- The menu should remain readable on mobile widths and should not overlap the page in a way that blocks the novel grid permanently.

---

## 10. File-Level Impact

### 10.1 Expected Files to Change

- `src/pages/index.astro`
  - add History button placement
  - pass data needed by client-side history logic
  - add or wire the client-side history UI

- `src/components/ReadingHistoryMenu.astro` *(recommended new component)*
  - encapsulate menu markup, styles, and browser-side logic

### 10.2 Files Likely Reused but Not Necessarily Changed

- `src/components/NovelCard.astro`
  - already supports displaying `lastChapter` if future UI wants homepage cards to surface progress

- `src/pages/novels/[slug]/index.astro`
  - current Continue Reading logic is the source pattern for resume-link behavior

- `src/pages/novels/[slug]/read.astro`
  - current progress writing remains the source of truth for history freshness

---

## 11. Risks

- The phrase “kapan dibaca” can only be implemented as **last read time** with current data.
- Client-side-only rendering means there may be a short delay before history appears after page load.
- If the homepage implementation becomes too script-heavy, it could make a simple static page harder to maintain.
- In words mode, the homepage should reuse the stored `batchSize` value exactly as the detail-page Continue Reading button does. The reader still enforces its existing words-mode behavior and validation when the route loads.

---

## 12. Acceptance Criteria

The feature is complete when all of the following are true:

1. The homepage shows a visible History trigger.
2. Clicking the trigger opens a history UI.
3. The history UI shows only novels with valid saved progress.
4. Each entry shows title, latest chapter, and last-read time.
5. Entries are ordered by `lastUpdated` descending.
6. Clicking an entry resumes the novel using `lastChapter` plus current `reader-preferences`.
7. Empty and malformed localStorage states fail gracefully.
8. The homepage remains usable on mobile breakpoints.

---

## 13. Future Enhancements

Out of scope for the first implementation, but enabled by this design:

- clear individual history entries,
- clear all history,
- show chapter title in addition to chapter number,
- show history directly on cards,
- keep a dedicated centralized history index,
- add first-read timestamp or richer session history.
