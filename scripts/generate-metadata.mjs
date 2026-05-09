#!/usr/bin/env node
import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';

async function generateMetadata() {
  const novelsDir = 'public/novels';
  const dirs = await readdir(novelsDir);
  
  for (const dir of dirs) {
    if (dir === 'index.json') continue;
    
    const infoPath = join(novelsDir, dir, 'info.json');
    const metadataPath = join(novelsDir, dir, 'metadata.json');
    
    try {
      const info = JSON.parse(await readFile(infoPath, 'utf-8'));
      
      const metadata = {
        slug: info.id,
        title: info.title,
        description: `Read ${info.title} online. ${info.totalChapters} chapters available.`,
        author: 'Unknown',
        coverImage: `/novels/${info.id}/cover.jpg`,
        totalChapters: info.totalChapters,
        publishDate: '2020-01-01',
        language: 'en',
        volumes: info.bundles.map(bundle => {
          const [start, end] = bundle.range.split('-').map(Number);
          return {
            id: bundle.id,
            file: bundle.file,
            chapterRange: [start, end]
          };
        })
      };
      
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`✓ Generated metadata for ${info.title}`);
    } catch (err) {
      console.error(`✗ Failed to process ${dir}:`, err.message);
    }
  }
}

generateMetadata().catch(console.error);
