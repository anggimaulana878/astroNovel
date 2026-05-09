export async function GET() {
  const baseUrl = 'https://your-domain.vercel.app';
  
  const urls = [
    { loc: `${baseUrl}/`, priority: '1.0' },
    { loc: `${baseUrl}/novels/super-gene`, priority: '0.9' },
  ];
  
  for (let i = 1; i <= 4000; i += 5) {
    urls.push({
      loc: `${baseUrl}/novels/super-gene/read?start=${i}&mode=chapters&size=5`,
      priority: '0.8'
    });
  }
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
