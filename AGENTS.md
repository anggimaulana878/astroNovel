# AGENTS.md

## Runtime and tooling
- Use **Node 22**. The repo pins `22` in `.nvmrc` and `>=22.12.0` in `package.json`.
- Use **npm**. The repo is lockfile-backed with `package-lock.json`.
- Main commands:
  - `npm install`
  - `npm run dev`
  - `npm run build`
  - `npm run preview`
  - `npm run test`
  - `npm run test:coverage`
  - `npm run astro -- check`

## What this app actually is
- This is an **Astro + Vercel** personal web novel reader.
- Static pages:
  - `/` from `src/pages/index.astro`
  - `/novels/[slug]` from `src/pages/novels/[slug]/index.astro`
- SSR page:
  - `/novels/[slug]/read` from `src/pages/novels/[slug]/read.astro`
  - The reader route explicitly sets `export const prerender = false`, so changes there affect on-demand server rendering.
- Novel data lives under `public/novels/`. Each novel directory is data-backed, not code-backed.

## Data model and loading
- `src/lib/novel-loader.ts` is the core server-side data path.
- Metadata is read from `public/novels/<slug>/metadata.json`.
- Chapter bundles are Brotli-compressed files referenced by metadata and decompressed server-side with a `10 MB` `maxOutputLength` guard.
- `public/novels/index.json` drives novel discovery for the homepage and static path generation.
- `scripts/generate-metadata.mjs` regenerates `metadata.json` from each novel’s `info.json`. If `info.json` changes, regenerate metadata instead of hand-editing multiple files.

## Reader-specific logic
- Batch sizing logic lives in `src/lib/batch-calculator.ts`.
  - `chapters` mode must stay within `1..12`.
  - `words` mode must stay within `1000..25000`.
- HTML cleanup for chapter bodies lives in `src/lib/html-sanitizer.ts`.
- The reader page also loads **all chapters** for the sidebar, so be careful with changes that increase per-request work in `read.astro` or `novel-loader.ts`.

## Tests and verification
- Unit tests currently cover the core lib logic only:
  - `src/lib/__tests__/batch-calculator.test.ts`
  - `src/lib/__tests__/html-sanitizer.test.ts`
- Vitest runs in `node` environment; coverage excludes `**/*.astro`, so page behavior is not protected by coverage.
- For changes to loader, batching, sanitization, or route wiring, use this verification order:
  1. `npm run test`
  2. `npm run astro -- check`
  3. `npm run build`

## Deployment facts worth trusting
- Vercel settings are split across `astro.config.mjs` and `vercel.json`.
- The app uses `@astrojs/vercel` with `maxDuration: 8`.
- `vercel.json` is the source of truth for build/install/dev commands and sets the region to `sin1`.

## Docs that are not source-of-truth
- `README.md` is still the stock Astro starter README. Do not rely on it for repo-specific guidance.
- `DEPLOYMENT.md` has useful operational context, but treat code/config as authoritative if it conflicts.
- `src/pages/sitemap.xml.ts` still contains placeholder domain data and a hard-coded novel path, so treat it as unfinished config, not canonical documentation.

## Change guidance
- Prefer changing `src/lib/*` helpers and data files deliberately rather than embedding more logic into page templates.
- When updating novel catalog content, inspect both `public/novels/index.json` and the per-novel directories so homepage discovery, static paths, and reader loading stay aligned.
- Avoid assuming SEO and deployment placeholders are production-ready; verify against current Vercel/domain setup before documenting or extending them.
