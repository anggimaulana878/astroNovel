# AstroNovel - Deployment Guide

## Prerequisites

- Node.js 22.x or higher
- Vercel account
- Novel data files (Brotli-compressed JSON)

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:4321
```

## Build for Production

```bash
# Build the project
npm run build

# Preview production build
npm run preview
```

## Deploy to Vercel

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Astro and configure build settings
6. Click "Deploy"

## Environment Configuration

No environment variables needed for Phase 1.

## Post-Deployment

1. Update `public/robots.txt` with your actual domain:
   ```
   Sitemap: https://your-actual-domain.vercel.app/sitemap.xml
   ```

2. Update `src/pages/sitemap.xml.ts` with your actual domain:
   ```typescript
   const baseUrl = 'https://your-actual-domain.vercel.app';
   ```

3. Test Google Assistant "Read it" feature:
   - Open reader page on Android Chrome
   - Activate Google Assistant
   - Say "Read it" or "Baca halaman ini"

## Vercel Configuration

The project is already configured with:
- `@astrojs/vercel` adapter
- 8-second function timeout (free tier safe)
- Brotli files included in serverless bundle
- Hybrid rendering (static + SSR)

## Performance Expectations

- **Static pages** (homepage, detail): Instant (CDN)
- **SSR pages** (reader): 200-500ms (cold start)
- **Cached SSR**: 50-100ms (warm function)

## Troubleshooting

### Build fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist .astro
npm install
npm run build
```

### Reader page 404
- Ensure Brotli files exist in `public/novels/[slug]/`
- Check metadata.json volume file paths
- Verify SSR is enabled (`export const prerender = false`)

### Dark mode not working
- Check browser localStorage
- Clear localStorage and refresh
- Verify system preference detection

## Next Steps

1. Add actual cover images to `public/novels/[slug]/cover.jpg`
2. Add actual Brotli-compressed chapter files
3. Test with real novel data
4. Monitor Vercel function logs
5. Set up custom domain (optional)

## Support

For issues, check:
- Astro docs: https://docs.astro.build
- Vercel docs: https://vercel.com/docs
- Project design spec: `docs/superpowers/specs/2026-05-09-phase1-foundation-design.md`
