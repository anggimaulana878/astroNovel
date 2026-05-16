# Mobile-First Homepage Optimization - Design Document

**Date**: 2026-05-16  
**Status**: Draft  
**Version**: 1.0

---

## 1. Overview

Optimize the homepage for mobile-first usage, given that roughly 99% of real usage is on phones.

The current homepage still reflects a desktop-first catalog layout: a roomy header, a poster-heavy card grid, and interaction patterns that are acceptable on desktop but inefficient on narrow touch screens.

This redesign should shift the homepage from a **desktop catalog grid** to a **mobile reading hub** that prioritizes quick scanning, fast resume actions, and thumb-friendly interaction.

**Primary user goal**: “When I open the homepage on my phone, I want to immediately continue reading or choose a novel without fighting cramped cards, wasted space, or awkward controls.”

---

## 2. Current Behavior and Constraints

### 2.1 Current Homepage Structure

The homepage currently lives in `src/pages/index.astro` and:

- prerenders statically,
- renders a page header with the title plus `ReadingHistoryMenu`,
- renders the novel list as a responsive CSS grid.

Current homepage CSS behavior:

- `.container` uses `padding: 40px 20px`
- `.page-header` uses `display: flex`, `justify-content: space-between`, `flex-wrap: wrap`, `gap: 12px`
- `.novel-grid` uses:
  - desktop: `repeat(auto-fill, minmax(200px, 1fr))` with `24px` gap
  - mobile (`max-width: 768px`): `repeat(auto-fill, minmax(150px, 1fr))` with `16px` gap

### 2.2 Current Novel Card Behavior

`src/components/NovelCard.astro` is still poster-first and desktop-shaped:

- card is vertical,
- cover is full width,
- cover height is fixed at `280px`,
- info block uses `16px` padding,
- title is `1.1em`,
- hover uses `translateY(-4px)`.

This works for desktop browsing, but on mobile it produces tall narrow cards with low information density.

### 2.3 Current Reading History Behavior

`src/components/ReadingHistoryMenu.astro` already exists and is now visually fixed.

Important behavior:

- desktop uses a dropdown panel,
- mobile already swaps to a fullscreen panel pattern at `max-width: 768px`,
- the trigger text is hidden on mobile,
- the trigger remains in the homepage header.

### 2.4 Architectural Constraints

- Homepage remains static and should stay lightweight.
- Existing design relies on CSS variables from `BaseLayout.astro`:
  - `--bg-primary`
  - `--bg-secondary`
  - `--text-primary`
  - `--text-secondary`
  - `--border`
  - `--accent`
  - `--accent-hover`
- Dark mode already exists through those variables and should be inherited automatically.
- Mobile optimization should avoid introducing a new framework or state layer.
- Desktop behavior still matters, even if mobile dominates usage.

---

## 3. Problem Statement

The homepage currently behaves like a compressed desktop grid rather than a screen intentionally designed for phones.

Main problems observed:

1. **Card density is poor on mobile**  
   Narrow columns plus `280px` poster covers waste vertical space and reduce scan speed.

2. **The layout is still catalog-first instead of resume-first**  
   The page does not prioritize the user’s most common action: quickly resuming or selecting a novel on a phone.

3. **Touch ergonomics are weak**  
   Some controls are undersized or still shaped by desktop hover-first assumptions.

4. **Vertical space is underused**  
   Desktop-scale spacing leaves too little useful content above the fold.

5. **Some interaction patterns still feel desktop-derived**  
   Hover transforms and roomy poster cards are not ideal for thumb-scrolling mobile usage.

---

## 4. Design Goals

### 4.1 Functional Goals

- Make the homepage feel intentionally designed for mobile first.
- Increase the number of useful items visible above the fold.
- Reduce friction for resuming reading.
- Improve tap ergonomics for core controls.
- Preserve existing homepage functionality and data flow.
- Keep desktop usable through deliberate `min-width` overrides rather than accidental inheritance.

### 4.2 UX Goals

- Shift from **poster-dominant browsing** to **information-dense reading selection**.
- Make the homepage feel closer to a lightweight mobile reading app than a compressed desktop site.
- Keep the History button and resume access obvious and reachable.
- Make card scanning faster by emphasizing title/progress over oversized cover art.
- Reduce touch-unfriendly motion and oversized poster chrome that currently waste vertical space on phones.

### 4.3 Non-Goals

- No reader-page redesign.
- No novel-detail-page redesign.
- No new search/filter system.
- No account or sync feature.
- No change to reading-progress storage format.

---

## 5. Proposed UX Direction

### 5.1 Mobile-First Home Philosophy

The homepage should become a **resume-first mobile feed**.

On phones, the default mental model should be:

- quick access to reading history,
- one clear list of novels,
- high scanability,
- minimal wasted space,
- thumb-friendly controls.

### 5.2 Header Behavior

On mobile, the header should become a **compact sticky header** with:

- page title,
- History button,
- tighter vertical spacing,
- stronger persistence while scrolling.

V1 recommendation:

- keep the current title + History button composition,
- make mobile the default layout,
- use desktop overrides for larger screens,
- add sticky behavior only if it does not create focus or overlap issues.

### 5.3 Novel List Layout

On mobile, the homepage should move from a multi-column poster grid to a **single-column feed**.

### 5.3.1 Breakpoint Strategy

V1 should use a simple, explicit breakpoint model:

- **Default / no media query** = mobile baseline, intended for roughly `360px..767px`
- **`@media (min-width: 768px)`** = tablet/desktop override path

This means implementation should stop treating mobile as a patch layered on top of desktop defaults. Mobile becomes the baseline, and larger screens progressively opt back into desktop density and poster-style presentation.

### 5.3.2 Mobile Card Structure

Recommended card direction:

- one novel per row,
- horizontal layout,
- cover on the left,
- text/progress on the right,
- significantly smaller cover thumbnail,
- tighter spacing,
- title line clamp,
- reading progress more visually useful than secondary metadata.

V1 should use these concrete layout targets:

- **Minimum card height**: approximately `100px..120px`
- **Cover target**: compact left-aligned thumbnail around `80x112px` class sizing
- **Info block**: vertical stack with `min-width: 0`
- **Title behavior**: max two lines with truncation/clamp
- **Metadata behavior**: smaller secondary text that stays readable without blowing up card height
- **Progress behavior**: remains visible and easier to parse than the current poster-first layout

This should improve information density and make browsing easier with one hand.

### 5.4 Reading History Interaction

The history feature should remain available as a strong mobile action.

On mobile, it should behave like a **mobile-native full panel / sheet**, not a tiny desktop dropdown metaphor.

The History button itself should meet real tap-target expectations.

### 5.5 Motion and Interaction

Hover effects should no longer drive the mobile experience.

Recommendation:

- keep subtle hover effects only under `@media (hover: hover)` or equivalent pointer-aware conditions,
- avoid transform-heavy hover states on touch-first layouts,
- prefer stable cards and clear active/tap feedback.

---

## 6. Proposed Layout Model

### 6.1 Mobile Default

For screens at phone size, the homepage should default to:

- tighter container padding,
- compact header,
- one-column novel feed,
- horizontal cards,
- smaller gaps,
- History button with 44–48px tap target minimum.

This baseline corresponds to the default `360px..767px` range described above.

### 6.2 Desktop Override

For wider screens, the homepage may restore:

- larger padding,
- non-sticky header,
- multi-column poster grid,
- vertical card layout,
- existing desktop-oriented spacing.

This inversion is intentional: **mobile should become the baseline**, and desktop should become the override.

Desktop overrides should begin at **`@media (min-width: 768px)`** for V1.

---

## 7. File-Level Design Impact

### 7.1 Primary Files Expected to Change

- `src/pages/index.astro`
- `src/components/NovelCard.astro`
- `src/components/ReadingHistoryMenu.astro`

### 7.2 `src/pages/index.astro`

Likely design changes:

- reduce mobile container padding,
- tighten header spacing,
- possibly introduce sticky header behavior,
- make the mobile feed the default layout,
- move desktop grid behavior into `@media (min-width: 768px)` overrides.

### 7.3 `src/components/NovelCard.astro`

Likely design changes:

- convert mobile card layout to horizontal,
- shrink mobile cover size significantly,
- reduce vertical padding,
- clamp title text,
- tune meta/progress typography for smaller widths,
- remove or guard hover transforms for touch devices.

### 7.4 `src/components/ReadingHistoryMenu.astro`

Likely design changes:

- strengthen the mobile History button tap target,
- ensure the fullscreen mobile panel feels intentional and polished,
- preserve desktop dropdown behavior,
- keep the static shell / runtime-list division intact.

---

## 8. Risks and Design Tradeoffs

### 8.1 Cover Art vs Information Density

Shrinking covers improves scan speed and saves space, but reduces visual drama.

Decision for this redesign:

- prioritize readability and browsing efficiency over oversized artwork on mobile.

### 8.2 Sticky Header Complexity

Sticky mobile headers improve reachability, but can introduce:

- overlap issues,
- focus behavior concerns,
- extra visual chrome.

Sticky behavior should be added only if it remains visually calm and does not interfere with content.

### 8.3 Desktop Regression Risk

Because the homepage is currently styled desktop-first, inverting toward mobile-first CSS increases the chance of accidental desktop regressions.

Desktop regression verification is mandatory.

### 8.4 Landscape Phones and Small Tablets

Portrait phone design is the priority, but landscape/mobile-tablet widths may require tuned overrides.

V1 should not overfit only a single phone width.

---

## 9. Accessibility and Interaction Expectations

- Primary interactive controls should meet at least a practical `44px`-class tap target.
- Hover-only feedback must not be the only affordance.
- The homepage should remain readable and usable in both light and dark mode.
- Sticky or fullscreen UI should preserve keyboard/focus sanity where relevant.
- Card text should remain readable without forcing zoom.

---

## 10. Acceptance Criteria

The mobile-home optimization is complete when all of the following are true:

1. On phone-sized screens, the homepage clearly feels mobile-first rather than a compressed desktop grid.
2. The novel list is easier to scan and uses vertical space more efficiently.
3. Core controls, especially the History button, are comfortably tappable.
4. Novel cards no longer feel overly tall or cramped on small screens.
5. Hover-based motion does not create awkward touch behavior.
6. Dark mode remains visually coherent using the existing CSS-variable system.
7. Desktop still renders correctly after the mobile-first inversion, including:
   - a useful multi-column grid,
   - visually balanced card width,
   - roomy spacing relative to the mobile baseline,
   - and preserved desktop dropdown behavior for the History button.
8. No existing reading-history or homepage functionality regresses.

---

## 11. Recommended Rollout Strategy

Implement this redesign in phases rather than as one large visual rewrite.

Suggested order:

1. **History button/panel mobile polish**
2. **Novel card mobile layout rewrite**
3. **Homepage spacing and header optimization**
4. **Desktop regression and polish pass**

This order prioritizes the most visible mobile pain points first while keeping rollback simpler.

---

## 12. Future Enhancements (Out of Scope for V1)

- dedicated “Continue Reading” module at top of homepage
- stronger card-level progress visualization
- mobile search / quick filter
- landscape-specific alternate layout
- more app-like bottom navigation or pinned actions
