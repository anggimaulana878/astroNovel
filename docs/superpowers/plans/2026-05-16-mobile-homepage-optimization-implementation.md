# Mobile-First Homepage Optimization - Implementation Plan

> **For agentic workers:** Implement this only after reading the paired spec: `docs/superpowers/specs/2026-05-16-mobile-homepage-optimization-design.md`.

**Goal:** Redesign the homepage so mobile becomes the primary layout baseline, with better scanability, denser useful content, stronger touch ergonomics, reduced motion-heavy chrome, and clearer reading-oriented hierarchy.

**Architecture fit:** Keep the homepage statically rendered and preserve the existing Astro component structure. This is a layout and interaction optimization, not a data-model change.

**Spec reference:** `docs/superpowers/specs/2026-05-16-mobile-homepage-optimization-design.md`

---

## 1. Implementation Strategy

Implement this as a staged UI refactor, not a single giant restyle.

Recommended sequence:

1. Stabilize mobile History button/panel ergonomics.
2. Rewrite mobile `NovelCard` layout to a single-column horizontal pattern.
3. Move homepage layout to mobile-first defaults.
4. Restore desktop behavior explicitly through `min-width` overrides.
5. Run focused visual and regression verification.

Do not change reader/storage logic as part of this task.

---

## 2. Source-of-Truth Files

Read these before implementation:

- `src/pages/index.astro`
- `src/components/NovelCard.astro`
- `src/components/ReadingHistoryMenu.astro`
- `src/layouts/Layout.astro`
- `src/layouts/BaseLayout.astro`

Supporting repo guidance:

- `AGENTS.md`
- `docs/superpowers/specs/2026-05-16-mobile-homepage-optimization-design.md`

Secondary context:

- `docs/superpowers/specs/2026-05-16-homepage-reading-history-design.md`
- `docs/superpowers/plans/2026-05-16-homepage-reading-history-implementation.md`

---

## 3. Expected File Changes

### 3.1 Modify

- `src/pages/index.astro`
- `src/components/NovelCard.astro`
- `src/components/ReadingHistoryMenu.astro`

### 3.2 Only If Needed

- `src/layouts/BaseLayout.astro` only if a global hover/tap guard or shared mobile utility becomes truly necessary

Avoid expanding scope beyond these files unless implementation proves it unavoidable.

---

## 4. Design Invariants to Preserve

These rules should stay true during implementation:

1. Homepage stays static.
2. Reading history remains client-side.
3. Existing CSS variable theme system remains the color source of truth.
4. Desktop still works after the mobile-first rewrite.
5. No new dependency or state library is introduced.

---

## 5. File-Level Responsibilities

### 5.1 `src/pages/index.astro`

Responsibilities after the redesign:

- define the homepage mobile-first container and header spacing,
- host the title + History button composition,
- define the novel-list layout behavior,
- explicitly restore desktop spacing/grid through `min-width` overrides.

Implementation intent:

- mobile should become the default CSS path,
- desktop should become the opt-in larger-screen override.
- use **default / no media query** for the `360px..767px` mobile baseline.
- use **`@media (min-width: 768px)`** for tablet/desktop overrides.

### 5.2 `src/components/NovelCard.astro`

Responsibilities after the redesign:

- provide a mobile-first horizontal card,
- keep novel cover, title, metadata, and optional progress readable,
- prevent text overflow and touch awkwardness,
- restore desktop vertical-card presentation above the mobile baseline.

Implementation intent:

- mobile card should prioritize scanability,
- cover should become a smaller thumbnail rather than a large poster,
- progress should remain visible and easy to parse.
- cover should sit on the **left** with a compact `80x112px`-class target.
- card height should land around a practical `100px..120px` range.
- title should clamp to two lines while the info stack uses `min-width: 0`.

### 5.3 `src/components/ReadingHistoryMenu.astro`

Responsibilities after the redesign:

- keep current history functionality intact,
- improve History button ergonomics,
- make the mobile panel feel intentional,
- preserve desktop dropdown behavior.

Implementation intent:

- mobile should feel like a proper fullscreen panel/sheet,
- trigger should remain reachable and comfortably tappable.

---

## 6. Implementation Phases

### Phase 1: History Mobile Ergonomics

**Target files:**
- `src/components/ReadingHistoryMenu.astro`

**Objectives:**
- improve History button tap target,
- remove hover-only assumptions on touch,
- confirm mobile fullscreen panel sizing/padding feels deliberate,
- keep desktop dropdown unchanged.

**Checklist:**
- [ ] Ensure trigger height/padding reaches practical mobile target size
- [ ] Guard desktop hover transforms behind hover-capable media queries if needed
- [ ] Review mobile panel spacing, close affordance, and scroll behavior
- [ ] Keep current runtime list rendering and CSS scoping fix intact

**Expected result:**
- history interaction feels mobile-native and no longer desktop-derived.

---

### Phase 2: Novel Card Mobile Rewrite

**Target files:**
- `src/components/NovelCard.astro`

**Objectives:**
- replace tall poster-first mobile cards with horizontal row cards,
- improve visible information density,
- preserve desktop vertical cards as a wider-screen override.

**Checklist:**
- [ ] Switch mobile card layout from block/vertical to row/horizontal
- [ ] Reduce cover dimensions substantially for mobile, targeting roughly `80x112px`
- [ ] Add `min-width: 0`-style protection for text wrapping/truncation
- [ ] Clamp title to two lines
- [ ] Keep progress and metadata readable at reduced scale
- [ ] Restrict hover transforms to hover-capable devices only

**Expected result:**
- each mobile card becomes faster to scan and uses less vertical space.

---

### Phase 3: Homepage Mobile-First Layout Inversion

**Target files:**
- `src/pages/index.astro`

**Objectives:**
- make mobile the default homepage layout,
- tighten spacing,
- optionally make the header sticky if it remains visually calm and non-disruptive.

**Checklist:**
- [ ] Reduce container padding for mobile default
- [ ] Tighten header spacing and heading size
- [ ] Convert the novel list to a mobile-first single-column layout
- [ ] Keep title + History button alignment stable on narrow screens
- [ ] Move desktop grid/padding behavior into `@media (min-width: 768px)` overrides

**Expected result:**
- homepage no longer feels like a compressed desktop grid.

---

### Phase 4: Desktop Regression Pass

**Target files:**
- `src/pages/index.astro`
- `src/components/NovelCard.astro`
- `src/components/ReadingHistoryMenu.astro`

**Objectives:**
- ensure the mobile-first inversion does not break desktop.

**Checklist:**
- [ ] Verify desktop grid still renders with expected spacing
- [ ] Verify desktop vertical card layout returns correctly
- [ ] Verify history menu still behaves like a dropdown on desktop
- [ ] Verify hover states still work where they should
- [ ] Verify desktop still shows a useful multi-column grid with balanced card widths and roomy spacing

**Expected result:**
- desktop remains intentional rather than accidentally inherited.

---

## 7. Recommended CSS/Interaction Direction

### 7.1 Mobile Defaults

These are the intended direction, not mandatory exact numbers:

- default / no media query is the mobile baseline for roughly `360px..767px`
- smaller container padding than the current `40px 20px`
- smaller header spacing than the current `32px` margin
- one-column feed rather than `minmax(150px, 1fr)` grid compression
- card thumbnails closer to compact book-preview size instead of `280px` cover height
- 44–48px-class touch targets for critical actions

### 7.2 Desktop Overrides

Restore desktop traits only above the mobile baseline:

- start desktop overrides at `@media (min-width: 768px)`
- larger padding,
- multi-column grid,
- vertical card presentation,
- richer hover feedback.

### 7.3 Motion Rules

- Avoid transform-heavy hover feedback as the default mobile behavior.
- Prefer `@media (hover: hover)` guards for hover transforms.
- Keep transitions subtle and non-janky.

---

## 8. Major Risks During Implementation

### 8.1 Over-Correcting Toward Minimalism

If cover thumbnails become too small, the homepage may lose too much visual identity.

Mitigation:
- reduce cover size, but keep proportions recognizably book-like.

### 8.2 Desktop Regression

Mobile-first inversion can silently break desktop spacing and card layout.

Mitigation:
- explicitly test desktop widths after each phase.

### 8.3 Dark Mode Contrast Drift

Tighter layouts make border and text contrast issues more obvious.

Mitigation:
- check light and dark mode visually, especially borders, secondary text, and panel chrome.

### 8.4 Landscape / Mid-Width Ambiguity

Some landscape phones and small tablets may sit awkwardly between phone and desktop assumptions.

Mitigation:
- verify at least one narrow portrait width and one wider mobile/tablet width before calling the redesign done.

---

## 9. Verification Plan

### 9.1 Manual Visual QA

Test at minimum:

- narrow phone width (~360–390px)
- larger phone width (~412–430px)
- tablet-ish / small desktop boundary (~768px)
- desktop width (1024px+)

Check for:

- header stability
- History button ergonomics
- history panel usability
- card readability
- title truncation quality
- progress visibility
- dark mode clarity
- hover/touch behavior sanity
- useful desktop column count and balanced card width at `1024px+`
- preserved dropdown behavior for the History button on desktop

### 9.2 Functional QA

- verify History still opens and closes correctly
- verify history items still render correctly after the mobile layout changes
- verify card links still navigate correctly
- verify resume/history behavior is unchanged functionally

### 9.3 Repo Verification Commands

Run after implementation:

1. `npm run test`
2. `npm run astro -- check`
3. `npm run build`

---

## 10. Suggested Commit Boundaries

If implemented in multiple commits, preferred grouping is:

1. `style: improve mobile History button and panel ergonomics`
2. `style: convert novel cards to mobile-first horizontal layout`
3. `style: make homepage layout mobile-first with desktop overrides`
4. `style: polish desktop regression fixes for mobile-home redesign`

If the implementation stays tight and coherent, one combined mobile-home redesign commit is also acceptable.

---

## 11. Definition of Done

This redesign is done when:

1. Mobile is the intentional default homepage layout.
2. Novel cards are denser and easier to scan on phones.
3. History is easier to reach and use on mobile.
4. The homepage wastes less vertical space above the fold.
5. Touch interactions feel more natural than before.
6. Dark mode still looks correct.
7. Desktop still renders and behaves correctly, including a useful multi-column grid, balanced card widths, roomy spacing, and preserved History dropdown behavior.
8. `test`, `astro -- check`, and `build` all pass.
