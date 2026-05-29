export function sanitizeChapterHTML(html: string, chapterTitle?: string): string {
  let sanitized = html;

  sanitized = sanitized.replace(/style="[^"]*"/g, '');

  // Iteratively replace divs with paragraphs to handle nested divs
  let previous: string;
  do {
    previous = sanitized;
    sanitized = sanitized.replace(/<div([^>]*)>([^<]*(?:<(?!\/?div\b)[^<]*)*)<\/div>/gi, '<p$1>$2</p>');
  } while (sanitized !== previous);

  sanitized = sanitized.replace(/<p\s+>/g, '<p>');

  sanitized = sanitized.replace(/<p>\s*<\/p>/g, '');

  if (chapterTitle) {
    const titlePattern = chapterTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const headingRegex = new RegExp(`<h[1-6][^>]*>\\s*${titlePattern}\\s*<\\/h[1-6]>`, 'i');
    sanitized = sanitized.replace(headingRegex, '');
  }

  return sanitized;
}
