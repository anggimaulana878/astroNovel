import { describe, it, expect } from 'vitest';
import { sanitizeChapterHTML } from '../html-sanitizer';

describe('html-sanitizer', () => {
  describe('sanitizeChapterHTML', () => {
    it('should convert div tags to p tags', () => {
      const html = '<div>Hello world</div><div>Another paragraph</div>';
      const result = sanitizeChapterHTML(html);
      
      expect(result).toBe('<p>Hello world</p><p>Another paragraph</p>');
    });

    it('should remove inline style attributes', () => {
      const html = '<p style="color: red;">Styled text</p>';
      const result = sanitizeChapterHTML(html);
      
      expect(result).toBe('<p>Styled text</p>');
    });

    it('should remove empty paragraphs', () => {
      const html = '<p>Content</p><p></p><p>  </p><p>More content</p>';
      const result = sanitizeChapterHTML(html);
      
      expect(result).toBe('<p>Content</p><p>More content</p>');
    });

    it('should handle mixed transformations', () => {
      const html = '<div style="margin: 10px;">Text</div><p></p><div>More</div>';
      const result = sanitizeChapterHTML(html);
      
      expect(result).toBe('<p>Text</p><p>More</p>');
    });

    it('should preserve heading tags', () => {
      const html = '<h1>Title</h1><div>Content</div>';
      const result = sanitizeChapterHTML(html);
      
      expect(result).toBe('<h1>Title</h1><p>Content</p>');
    });

    it('should handle empty input', () => {
      const result = sanitizeChapterHTML('');
      expect(result).toBe('');
    });
  });
});
