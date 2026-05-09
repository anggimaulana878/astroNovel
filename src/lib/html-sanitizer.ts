export function sanitizeChapterHTML(html: string): string {
  let sanitized = html;
  
  sanitized = sanitized.replace(/style="[^"]*"/g, '');
  
  sanitized = sanitized.replace(/<div([^>]*)>(.*?)<\/div>/g, '<p$1>$2</p>');
  
  sanitized = sanitized.replace(/<p\s+>/g, '<p>');
  
  sanitized = sanitized.replace(/<p>\s*<\/p>/g, '');
  
  return sanitized;
}
